import fs from 'node:fs';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { env } from '../../config/env.js';
import { findGameById } from '../games/game.repository.js';
import { HttpError } from '../../utils/http-error.js';
import {
  createAttendanceRecord,
  deleteAttendanceRecord,
  findAttendanceRecordByGame,
  findAttendanceRecordById,
  getAttendanceStats,
  listAttendanceRecords,
  updateAttendancePhoto,
  updateAttendanceRecord,
} from './attendance.repository.js';
import {
  findCompanionForUser,
  replaceAttendanceCompanions,
  updateCompanionStatus,
} from './companion.repository.js';
import { createNotification } from '../notifications/notification.repository.js';
import { attendancePhotoUpload } from './upload.js';
import { findUserById } from '../users/user.repository.js';
import { buildAttendanceScoreFields } from './attendance-score.js';

export const attendanceRouter = Router();

fs.mkdirSync(env.uploadDir, { recursive: true });

const attendanceWriteRateLimit = rateLimit({
  scope: 'attendance:write',
  windowMs: 10 * 60 * 1000,
  max: 30,
});

const attendancePhotoRateLimit = rateLimit({
  scope: 'attendance:photo',
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: '사진 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

function normalizeNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertOwner(record: { userId: number }, userId: number) {
  if (record.userId !== userId) {
    throw new HttpError(403, 'FORBIDDEN', '본인의 직관 기록만 수정할 수 있습니다.');
  }
}

async function assertCanEdit(record: { id: number; userId: number }, userId: number) {
  if (record.userId === userId) {
    return;
  }

  const companion = await findCompanionForUser({
    recordId: record.id,
    userId,
  });

  if (companion?.status === 'accepted') {
    return;
  }

  throw new HttpError(
    403,
    'FORBIDDEN',
    '작성자 또는 수락한 동행자만 수정할 수 있습니다.',
  );
}

function normalizeWatchType(value: unknown) {
  return value === 'home' ? 'home' : 'stadium';
}

function normalizeCompanionUserIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

async function saveCompanionsAndNotify(input: {
  recordId: number;
  ownerId: number;
  ownerLabel: string;
  companionUserIds: number[];
}) {
  const { newUserIds } = await replaceAttendanceCompanions({
    recordId: input.recordId,
    ownerId: input.ownerId,
    companionUserIds: input.companionUserIds,
  });

  await Promise.all(
    newUserIds.map((userId) =>
      createNotification({
        userId,
        actorUserId: input.ownerId,
        attendanceRecordId: input.recordId,
        type: 'attendance_tagged',
        message: `${input.ownerLabel}님이 나를 직관 기록에 태그했어요. 마이페이지에서 수락 또는 거절을 선택해주세요.`,
      }),
    ),
  );
}

attendanceRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const records = await listAttendanceRecords({
      userId: req.user?.id ?? 0,
      from,
      to,
    });

    res.json({
      items: records,
    });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/stats/me', authenticate, async (req, res, next) => {
  try {
    const stats = await getAttendanceStats(req.user?.id ?? 0);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

attendanceRouter.post(
  '/',
  authenticate,
  attendanceWriteRateLimit,
  async (req, res, next) => {
    try {
      const { gameId, memo, result, watchType } = req.body as {
        gameId?: number;
        memo?: string;
        watchType?: string;
        myTeamScore?: number;
        opponentScore?: number;
        result?: string;
        companionUserIds?: number[];
      };
      const userId = req.user?.id ?? 0;

      if (!Number.isInteger(gameId) || !gameId) {
        throw new HttpError(400, 'INVALID_INPUT', '경기를 선택해주세요.');
      }

      const game = await findGameById(gameId);

      if (!game) {
        throw new HttpError(404, 'GAME_NOT_FOUND', '경기를 찾을 수 없습니다.');
      }

      const existingRecord = await findAttendanceRecordByGame({
        userId,
        gameId,
      });

      if (existingRecord) {
        throw new HttpError(409, 'ATTENDANCE_ALREADY_EXISTS', '이미 직관 기록이 있습니다.');
      }

      const user = await findUserById(userId);
      const scoreFields = buildAttendanceScoreFields({
        game,
        favoriteTeamId: user?.favoriteTeamId ?? null,
        body: req.body,
        normalizeNumber,
      });

      const record = await createAttendanceRecord({
        userId,
        gameId,
        watchType: normalizeWatchType(watchType),
        memo: memo?.trim() || null,
        myTeamScore: scoreFields.myTeamScore,
        opponentScore: scoreFields.opponentScore,
        result: scoreFields.result,
        isScoreModified: scoreFields.isScoreModified,
      });

      if (record) {
        await saveCompanionsAndNotify({
          recordId: record.id,
          ownerId: userId,
          ownerLabel: record.ownerNickname,
          companionUserIds: normalizeCompanionUserIds(req.body.companionUserIds),
        });
      }

      res.status(201).json({
        record: record ? await findAttendanceRecordById(record.id) : record,
      });
    } catch (error) {
      next(error);
    }
  },
);

attendanceRouter.get('/:recordId', authenticate, async (req, res, next) => {
  try {
    const recordId = Number(req.params.recordId);
    const userId = req.user?.id ?? 0;
    const record = await findAttendanceRecordById(recordId);

    if (!record) {
      throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
    }

    if (record.userId !== userId) {
      const companion = await findCompanionForUser({ recordId, userId });

      if (!companion) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          '본인이 작성하거나 태그된 직관 기록만 조회할 수 있습니다.',
        );
      }

      record.viewerRelation = 'companion';
      record.canEdit = companion.status === 'accepted';
    } else {
      record.canEdit = true;
    }

    res.json({
      record,
    });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.patch(
  '/:recordId',
  authenticate,
  attendanceWriteRateLimit,
  async (req, res, next) => {
    try {
      const record = await findAttendanceRecordById(Number(req.params.recordId));

      if (!record) {
        throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
      }

      await assertCanEdit(record, req.user?.id ?? 0);

      const { memo, result, watchType } = req.body as {
        memo?: string;
        watchType?: string;
        result?: string;
        companionUserIds?: number[];
      };
      const game = await findGameById(record.gameId);
      if (!game) {
        throw new HttpError(404, 'GAME_NOT_FOUND', '경기를 찾을 수 없습니다.');
      }

      const owner = await findUserById(record.userId);
      const scoreFields = buildAttendanceScoreFields({
        game,
        favoriteTeamId: owner?.favoriteTeamId ?? null,
        body: req.body,
        normalizeNumber,
      });

      const updatedRecord = await updateAttendanceRecord({
        id: record.id,
        watchType: normalizeWatchType(watchType),
        memo: memo?.trim() || null,
        myTeamScore: scoreFields.myTeamScore,
        opponentScore: scoreFields.opponentScore,
        result: scoreFields.result,
        isScoreModified: scoreFields.isScoreModified,
        lastModifiedByUserId: req.user?.id ?? 0,
      });

      if (updatedRecord && updatedRecord.userId === req.user?.id) {
        await saveCompanionsAndNotify({
          recordId: updatedRecord.id,
          ownerId: record.userId,
          ownerLabel: record.ownerNickname,
          companionUserIds: normalizeCompanionUserIds(req.body.companionUserIds),
        });
      }

      res.json({
        record: updatedRecord
          ? await findAttendanceRecordById(updatedRecord.id)
          : updatedRecord,
      });
    } catch (error) {
      next(error);
    }
  },
);

attendanceRouter.delete('/:recordId', authenticate, async (req, res, next) => {
  try {
    const record = await findAttendanceRecordById(Number(req.params.recordId));

    if (!record) {
      throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
    }

    assertOwner(record, req.user?.id ?? 0);

    await deleteAttendanceRecord(record.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

attendanceRouter.post(
  '/:recordId/photo',
  authenticate,
  attendancePhotoRateLimit,
  attendancePhotoUpload.single('photo'),
  async (req, res, next) => {
    try {
      const record = await findAttendanceRecordById(Number(req.params.recordId));

      if (!record) {
        throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
      }

      await assertCanEdit(record, req.user?.id ?? 0);

      if (!req.file) {
        throw new HttpError(400, 'INVALID_INPUT', '사진 파일을 선택해주세요.');
      }

      const updatedRecord = await updateAttendancePhoto({
        id: record.id,
        photoUrl: `/uploads/${req.file.filename}`,
        lastModifiedByUserId: req.user?.id ?? 0,
      });

      res.json({
        record: updatedRecord,
      });
    } catch (error) {
      next(error);
    }
  },
);

attendanceRouter.patch(
  '/:recordId/companions/me',
  authenticate,
  async (req, res, next) => {
    try {
      const recordId = Number(req.params.recordId);
      const userId = req.user?.id ?? 0;
      const { status } = req.body as { status?: unknown };

      if (status !== 'accepted' && status !== 'rejected') {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '수락 또는 거절 중 하나를 선택해주세요.',
        );
      }

      const companion = await findCompanionForUser({ recordId, userId });

      if (!companion) {
        throw new HttpError(
          404,
          'COMPANION_NOT_FOUND',
          '본인이 태그된 동행 기록만 응답할 수 있습니다.',
        );
      }

      if (companion.status === status) {
        const record = await findAttendanceRecordById(recordId);
        res.json({
          companion: { ...companion },
          record,
        });
        return;
      }

      const updated = await updateCompanionStatus({
        recordId,
        userId,
        status,
      });

      if (!updated) {
        throw new HttpError(
          404,
          'COMPANION_NOT_FOUND',
          '본인이 태그된 동행 기록만 응답할 수 있습니다.',
        );
      }

      const record = await findAttendanceRecordById(recordId);

      if (record) {
        const responder = await findUserById(userId);
        const responderLabel = responder?.nickname ?? '동행자';
        const message =
          status === 'accepted'
            ? `${responderLabel}님이 동행 태그를 수락했어요.`
            : `${responderLabel}님이 동행 태그를 거절했어요.`;

        await createNotification({
          userId: record.userId,
          actorUserId: userId,
          attendanceRecordId: recordId,
          type:
            status === 'accepted' ? 'companion_accepted' : 'companion_rejected',
          message,
        });
      }

      res.json({
        companion: { ...companion, status, respondedAt: new Date() },
        record,
      });
    } catch (error) {
      next(error);
    }
  },
);
