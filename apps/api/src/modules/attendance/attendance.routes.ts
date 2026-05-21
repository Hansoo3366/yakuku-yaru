import fs from 'node:fs';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
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
import { upload } from './upload.js';

export const attendanceRouter = Router();

fs.mkdirSync(env.uploadDir, { recursive: true });

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

attendanceRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { gameId, memo, result } = req.body as {
      gameId?: number;
      memo?: string;
      myTeamScore?: number;
      opponentScore?: number;
      result?: string;
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

    const record = await createAttendanceRecord({
      userId,
      gameId,
      memo: memo?.trim() || null,
      myTeamScore: normalizeNumber(req.body.myTeamScore),
      opponentScore: normalizeNumber(req.body.opponentScore),
      result: result || null,
      isScoreModified: true,
    });

    res.status(201).json({
      record,
    });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/:recordId', authenticate, async (req, res, next) => {
  try {
    const record = await findAttendanceRecordById(Number(req.params.recordId));

    if (!record) {
      throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
    }

    assertOwner(record, req.user?.id ?? 0);

    res.json({
      record,
    });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.patch('/:recordId', authenticate, async (req, res, next) => {
  try {
    const record = await findAttendanceRecordById(Number(req.params.recordId));

    if (!record) {
      throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
    }

    assertOwner(record, req.user?.id ?? 0);

    const { memo, result } = req.body as {
      memo?: string;
      result?: string;
    };
    const updatedRecord = await updateAttendanceRecord({
      id: record.id,
      memo: memo?.trim() || null,
      myTeamScore: normalizeNumber(req.body.myTeamScore),
      opponentScore: normalizeNumber(req.body.opponentScore),
      result: result || null,
      isScoreModified: true,
    });

    res.json({
      record: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
});

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
  upload.single('photo'),
  async (req, res, next) => {
    try {
      const record = await findAttendanceRecordById(Number(req.params.recordId));

      if (!record) {
        throw new HttpError(404, 'ATTENDANCE_NOT_FOUND', '직관 기록을 찾을 수 없습니다.');
      }

      assertOwner(record, req.user?.id ?? 0);

      if (!req.file) {
        throw new HttpError(400, 'INVALID_INPUT', '사진 파일을 선택해주세요.');
      }

      const updatedRecord = await updateAttendancePhoto({
        id: record.id,
        photoUrl: `/uploads/${req.file.filename}`,
      });

      res.json({
        record: updatedRecord,
      });
    } catch (error) {
      next(error);
    }
  },
);
