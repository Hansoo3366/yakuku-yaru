import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import { deleteComment } from '../comments/comment.repository.js';
import { deletePost } from '../posts/post.repository.js';
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
