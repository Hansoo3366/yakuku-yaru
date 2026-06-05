import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import { deleteComment } from '../comments/comment.repository.js';
import {
  deletePlayerCheer,
  findPlayerCheerByPlayerId,
  listPlayerCheers,
  upsertPlayerCheer,
} from '../player-cheers/player-cheer.repository.js';
import { deletePost } from '../posts/post.repository.js';
import { findUserById, setUserEmailVerified } from '../users/user.repository.js';
import {
  createAdminGame,
  deleteAdminUser,
  getAdminSummary,
  listAdminComments,
  listAdminGames,
  listAdminPosts,
  listAdminUsers,
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

function optionalPositiveInteger(value: unknown, fallback: number, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'INVALID_INPUT', `${label} 값이 올바르지 않습니다.`);
  }

  return parsed;
}

function rosterScope(value: unknown) {
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

function parsePlayerCheerInput(body: Record<string, unknown>, playerId: number) {
  const youtubeIdSource = nullableString(body.youtubeId) ?? nullableString(body.youtubeUrl);
  const youtubeId = extractYoutubeId(youtubeIdSource);

  if (youtubeIdSource && !youtubeId) {
    throw new HttpError(400, 'INVALID_INPUT', '올바른 유튜브 영상 ID가 필요합니다.');
  }

  return {
    playerId,
    title: nullableString(body.title),
    youtubeId,
    youtubeUrl: null,
    lyrics: nullableString(body.lyrics),
  };
}

function parseGameInput(body: Record<string, unknown>) {
  const gameDate = typeof body.gameDate === 'string' ? body.gameDate.trim() : '';
  const stadium = typeof body.stadium === 'string' ? body.stadium.trim() : '';
  const homeTeamId = Number(body.homeTeamId);
  const awayTeamId = Number(body.awayTeamId);
  const status = typeof body.status === 'string' ? body.status.trim() : 'scheduled';

  if (!gameDate || !stadium || !Number.isInteger(homeTeamId) || !Number.isInteger(awayTeamId)) {
    throw new HttpError(400, 'INVALID_INPUT', '경기 날짜, 구장, 홈/원정 팀을 입력해주세요.');
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
    res.json({ items: await listAdminUsers(optionalKeyword(req.query.keyword)) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/users/:userId/role', adminWriteLimit, async (req, res, next) => {
  try {
    const role = req.body?.role;
    if (role !== 'admin' && role !== 'user') {
      throw new HttpError(400, 'INVALID_INPUT', '역할은 admin 또는 user만 가능합니다.');
    }

    await updateUserRole(Number(req.params.userId), role);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch(
  '/users/:userId/email-verification',
  adminWriteLimit,
  async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const { verified } = req.body as { verified?: boolean };

      if (typeof verified !== 'boolean') {
        throw new HttpError(400, 'INVALID_INPUT', 'verified 값(true/false)이 필요합니다.');
      }

      const user = await findUserById(userId);

      if (!user) {
        throw new HttpError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
      }

      await setUserEmailVerified(userId, verified);
      res.json({ ok: true, verified });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete('/users/:userId', adminWriteLimit, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (userId === req.user?.id) {
      throw new HttpError(400, 'INVALID_INPUT', '자기 자신은 삭제할 수 없습니다.');
    }

    await deleteAdminUser(userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/posts', async (req, res, next) => {
  try {
    res.json({ items: await listAdminPosts(optionalKeyword(req.query.keyword)) });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/posts/:postId', adminWriteLimit, async (req, res, next) => {
  try {
    await deletePost(Number(req.params.postId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/comments', async (req, res, next) => {
  try {
    res.json({ items: await listAdminComments(optionalKeyword(req.query.keyword)) });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/comments/:commentId', adminWriteLimit, async (req, res, next) => {
  try {
    await deleteComment(Number(req.params.commentId));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/player-cheers', async (req, res, next) => {
  try {
    res.json(await listPlayerCheers({
      keyword: optionalKeyword(req.query.keyword),
      teamId: optionalTeamId(req.query.teamId),
      page: optionalPositiveInteger(req.query.page, 1, 'page'),
      rosterScope: rosterScope(req.query.rosterScope),
      size: optionalPositiveInteger(req.query.size, 24, 'size'),
    }));
  } catch (error) {
    next(error);
  }
});

adminRouter.put('/player-cheers/:playerId', adminWriteLimit, async (req, res, next) => {
  try {
    const playerId = parsePlayerId(req.params.playerId);
    const player = await findPlayerCheerByPlayerId(playerId);

    if (!player) {
      throw new HttpError(404, 'PLAYER_NOT_FOUND', '선수를 찾을 수 없습니다.');
    }

    await upsertPlayerCheer(parsePlayerCheerInput(req.body ?? {}, playerId));
    res.json({ item: await findPlayerCheerByPlayerId(playerId) });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/player-cheers/:playerId', adminWriteLimit, async (req, res, next) => {
  try {
    const playerId = parsePlayerId(req.params.playerId);
    await deletePlayerCheer(playerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

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
