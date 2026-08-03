import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import { deleteUploadedFile } from '../../utils/upload-file.js';
import { deleteComment } from '../comments/comment.repository.js';
import {
  deleteTeamCheer,
  deletePlayerCheer,
  findPlayerCheerByPlayerId,
  findTeamCheerByTeamId,
  listTeamCheers,
  listPlayerCheers,
  upsertTeamCheer,
  upsertPlayerCheer,
} from '../player-cheers/player-cheer.repository.js';
import { deletePost } from '../posts/post.repository.js';
import { updatePostModeration } from '../posts/post.repository.js';
import { deleteAttendanceRecord } from '../attendance/attendance.repository.js';
import { findAttendanceRecordById } from '../attendance/attendance.repository.js';
import {
  listAdminReports,
  updateContentReport,
} from '../reports/report.repository.js';
import {
  findUserById,
  setUserEmailVerified,
} from '../users/user.repository.js';
import {
  createAdminGame,
  clearAdminAttendancePhoto,
  clearAdminUserProfileImage,
  deleteAdminUser,
  getAdminSummary,
  listAdminComments,
  listAdminAttendanceRecords,
  listAdminGames,
  listAdminPosts,
  listAdminUsers,
  listAdminUserUploadUrls,
  updateAdminGame,
  updateUserRole,
} from './admin.repository.js';

export const adminRouter = Router();

const adminWriteLimit = rateLimit({
  scope: 'admin:write',
  windowMs: 60 * 1000,
  max: 30,
});

adminRouter.use(authenticate, requireAdmin);

function optionalKeyword(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parsePlayerId(value: unknown) {
  const playerId = Number(value);

  if (!Number.isInteger(playerId) || playerId < 1) {
    throw new HttpError(400, 'INVALID_INPUT', '올바른 선수 ID가 필요합니다.');
  }

  return playerId;
}

function optionalTeamId(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'INVALID_INPUT', '올바른 팀 ID가 필요합니다.');
  }

  return parsed;
}

function optionalPositiveInteger(
  value: unknown,
  fallback: number,
  label: string,
) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      `${label} 값이 올바르지 않습니다.`,
    );
  }

  return parsed;
}

function rosterScope(value: unknown) {
  if (value === 'recentLineup') {
    return 'recentLineup' as const;
  }

  if (value === 'all') {
    return 'all' as const;
  }

  return 'firstTeam' as const;
}

function extractYoutubeId(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^[A-Za-z0-9_-]{6,32}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return /^[A-Za-z0-9_-]{6,32}$/.test(id) ? id : null;
    }

    const queryId = url.searchParams.get('v') ?? '';

    if (/^[A-Za-z0-9_-]{6,32}$/.test(queryId)) {
      return queryId;
    }

    const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,32})/);
    return embedMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function parsePlayerCheerInput(
  body: Record<string, unknown>,
  player: {
    playerId: number;
    position: string | null;
    recentLineupRole: string | null;
  },
) {
  const youtubeIdSource =
    nullableString(body.youtubeId) ?? nullableString(body.youtubeUrl);
  const youtubeId = extractYoutubeId(youtubeIdSource);

  if (youtubeIdSource && !youtubeId) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      '올바른 유튜브 영상 ID가 필요합니다.',
    );
  }

  return {
    playerId: player.playerId,
    title:
      player.position?.includes('투수') ||
      player.recentLineupRole?.startsWith('pitcher')
        ? '등장곡'
        : '응원가',
    youtubeId,
    youtubeUrl: null,
    lyrics: nullableString(body.lyrics),
  };
}

function parseTeamCheerInput(body: Record<string, unknown>, teamId: number) {
  const youtubeIdSource =
    nullableString(body.youtubeId) ?? nullableString(body.youtubeUrl);
  const youtubeId = extractYoutubeId(youtubeIdSource);

  if (youtubeIdSource && !youtubeId) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      '올바른 유튜브 영상 ID가 필요합니다.',
    );
  }

  return {
    teamId,
    title: nullableString(body.title),
    youtubeId,
    youtubeUrl: null,
    lyrics: nullableString(body.lyrics),
  };
}

function parseGameInput(body: Record<string, unknown>) {
  const gameDate =
    typeof body.gameDate === 'string' ? body.gameDate.trim() : '';
  const stadium = typeof body.stadium === 'string' ? body.stadium.trim() : '';
  const homeTeamId = Number(body.homeTeamId);
  const awayTeamId = Number(body.awayTeamId);
  const status =
    typeof body.status === 'string' ? body.status.trim() : 'scheduled';

  if (
    !gameDate ||
    !stadium ||
    !Number.isInteger(homeTeamId) ||
    !Number.isInteger(awayTeamId)
  ) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      '경기 날짜, 구장, 홈/원정 팀을 입력해주세요.',
    );
  }

  return {
    gameDate,
    stadium,
    homeTeamId,
    awayTeamId,
    homeScore: nullableNumber(body.homeScore),
    awayScore: nullableNumber(body.awayScore),
    status,
    ticketUrl:
      typeof body.ticketUrl === 'string' && body.ticketUrl.trim()
        ? body.ticketUrl.trim()
        : null,
    ticketOpenAt:
      typeof body.ticketOpenAt === 'string' && body.ticketOpenAt.trim()
        ? body.ticketOpenAt.trim()
        : null,
  };
}

adminRouter.get('/summary', async (_req, res, next) => {
  try {
    res.json(await getAdminSummary());
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    res.json({
      items: await listAdminUsers(optionalKeyword(req.query.keyword)),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch(
  '/users/:userId/role',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const role = req.body?.role;
      if (role !== 'admin' && role !== 'user') {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '역할은 admin 또는 user만 가능합니다.',
        );
      }

      await updateUserRole(Number(req.params.userId), role);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  '/users/:userId/email-verification',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const { verified } = req.body as { verified?: boolean };

      if (typeof verified !== 'boolean') {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          'verified 값(true/false)이 필요합니다.',
        );
      }

      const user = await findUserById(userId);

      if (!user) {
        throw new HttpError(
          404,
          'USER_NOT_FOUND',
          '사용자를 찾을 수 없습니다.',
        );
      }

      await setUserEmailVerified(userId, verified);
      res.json({ ok: true, verified });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  '/users/:userId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);

      if (userId === req.user?.id) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '자기 자신은 삭제할 수 없습니다.',
        );
      }

      const uploadUrls = await listAdminUserUploadUrls(userId);
      await deleteAdminUser(userId);
      await Promise.all(
        uploadUrls.map((assetUrl) => deleteUploadedFile(assetUrl)),
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  '/users/:userId/profile-image',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const profileImageUrl = await clearAdminUserProfileImage(
        Number(req.params.userId),
      );
      await deleteUploadedFile(profileImageUrl);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get('/posts', async (req, res, next) => {
  try {
    res.json({
      items: await listAdminPosts(optionalKeyword(req.query.keyword)),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete(
  '/posts/:postId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      await deletePost(Number(req.params.postId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  '/posts/:postId/moderation',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const category = req.body?.category;
      const isPinned = req.body?.isPinned;
      const requestStatus = req.body?.requestStatus;
      const categories = new Set([
        'review',
        'free',
        'info',
        'feature',
        'notice',
      ]);
      const requestStatuses = new Set([
        'received',
        'reviewing',
        'in_progress',
        'completed',
        'deferred',
      ]);

      if (!categories.has(category) || typeof isPinned !== 'boolean') {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '게시글 분류와 고정 상태를 확인해주세요.',
        );
      }

      const normalizedStatus =
        category === 'feature' && requestStatuses.has(requestStatus)
          ? requestStatus
          : null;
      const post = await updatePostModeration({
        id: Number(req.params.postId),
        category,
        isPinned,
        requestStatus: normalizedStatus,
      });

      if (!post) {
        throw new HttpError(
          404,
          'POST_NOT_FOUND',
          '게시글을 찾을 수 없습니다.',
        );
      }

      res.json({ post });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get('/comments', async (req, res, next) => {
  try {
    res.json({
      items: await listAdminComments(optionalKeyword(req.query.keyword)),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete(
  '/comments/:commentId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      await deleteComment(Number(req.params.commentId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get('/attendance-records', async (req, res, next) => {
  try {
    res.json({
      items: await listAdminAttendanceRecords(
        optionalKeyword(req.query.keyword),
      ),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete(
  '/attendance-records/:recordId/photo',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const photoUrl = await clearAdminAttendancePhoto(
        Number(req.params.recordId),
      );
      await deleteUploadedFile(photoUrl);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  '/attendance-records/:recordId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const recordId = Number(req.params.recordId);
      const record = await findAttendanceRecordById(recordId);
      await deleteAttendanceRecord(recordId);
      await deleteUploadedFile(record?.photoUrl);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get('/reports', async (req, res, next) => {
  try {
    const status =
      typeof req.query.status === 'string' && req.query.status
        ? req.query.status
        : undefined;
    res.json({ items: await listAdminReports(status) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch(
  '/reports/:reportId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const status = req.body?.status;
      const statuses = new Set([
        'pending',
        'reviewing',
        'resolved',
        'dismissed',
      ]);
      if (!statuses.has(status)) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '신고 처리 상태를 확인해주세요.',
        );
      }

      await updateContentReport({
        id: Number(req.params.reportId),
        status,
        adminNote: nullableString(req.body?.adminNote),
        resolverUserId: req.user?.id ?? 0,
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get('/player-cheers', async (req, res, next) => {
  try {
    res.json(
      await listPlayerCheers({
        keyword: optionalKeyword(req.query.keyword),
        teamId: optionalTeamId(req.query.teamId),
        page: optionalPositiveInteger(req.query.page, 1, 'page'),
        rosterScope: rosterScope(req.query.rosterScope),
        size: optionalPositiveInteger(req.query.size, 24, 'size'),
      }),
    );
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/team-cheers', async (_req, res, next) => {
  try {
    res.json({ items: await listTeamCheers() });
  } catch (error) {
    next(error);
  }
});

adminRouter.put(
  '/team-cheers/:teamId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const teamId = Number(req.params.teamId);

      if (!Number.isInteger(teamId) || teamId < 1) {
        throw new HttpError(400, 'INVALID_INPUT', '올바른 팀 ID가 필요합니다.');
      }

      const teamCheer = await findTeamCheerByTeamId(teamId);

      if (!teamCheer) {
        throw new HttpError(404, 'TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
      }

      await upsertTeamCheer(parseTeamCheerInput(req.body ?? {}, teamId));
      res.json({ item: await findTeamCheerByTeamId(teamId) });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  '/team-cheers/:teamId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const teamId = Number(req.params.teamId);

      if (!Number.isInteger(teamId) || teamId < 1) {
        throw new HttpError(400, 'INVALID_INPUT', '올바른 팀 ID가 필요합니다.');
      }

      await deleteTeamCheer(teamId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.put(
  '/player-cheers/:playerId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const playerId = parsePlayerId(req.params.playerId);
      const player = await findPlayerCheerByPlayerId(playerId);

      if (!player) {
        throw new HttpError(
          404,
          'PLAYER_NOT_FOUND',
          '선수를 찾을 수 없습니다.',
        );
      }

      await upsertPlayerCheer(parsePlayerCheerInput(req.body ?? {}, player));
      res.json({ item: await findPlayerCheerByPlayerId(playerId) });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  '/player-cheers/:playerId',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const playerId = parsePlayerId(req.params.playerId);
      await deletePlayerCheer(playerId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get('/games', async (_req, res, next) => {
  try {
    res.json({ items: await listAdminGames() });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/games', adminWriteLimit, async (req, res, next) => {
  try {
    const id = await createAdminGame(parseGameInput(req.body ?? {}));
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/games/:gameId', adminWriteLimit, async (req, res, next) => {
  try {
    await updateAdminGame({
      id: Number(req.params.gameId),
      ...parseGameInput(req.body ?? {}),
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
