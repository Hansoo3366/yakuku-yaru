import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
} from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import { getAttendanceStats } from '../attendance/attendance.repository.js';
import { createNotification } from '../notifications/notification.repository.js';
import { listRecentPostsByUser } from '../posts/post.repository.js';
import { findUserById, searchUsers } from './user.repository.js';
import {
  countSharedAttendanceGames,
  discoverFans,
  findFanSummaryById,
  followUser,
  unfollowUser,
} from './social.repository.js';

export const userRouter = Router();

const followRateLimit = rateLimit({
  scope: 'users:follow',
  windowMs: 60 * 1000,
  max: 30,
});

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

userRouter.get('/discover', optionalAuthenticate, async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const size = Math.min(parsePositiveInt(req.query.size, 18), 36);
    const teamId = req.query.teamId
      ? parsePositiveInt(req.query.teamId, 0)
      : null;
    const keyword =
      typeof req.query.keyword === 'string'
        ? req.query.keyword.trim().slice(0, 50)
        : '';
    const result = await discoverFans({
      viewerUserId: req.user?.id ?? null,
      keyword: keyword || undefined,
      teamId: teamId || null,
      page,
      size,
    });

    res.json({
      ...result,
      page,
      size,
      totalPages: Math.ceil(result.total / size),
    });
  } catch (error) {
    next(error);
  }
});

userRouter.get('/search', authenticate, async (req, res, next) => {
  try {
    const keyword =
      typeof req.query.keyword === 'string'
        ? req.query.keyword.trim().slice(0, 50)
        : '';

    if (keyword.length < 2) {
      res.json({ items: [] });
      return;
    }

    const users = await searchUsers({
      keyword,
      excludeUserId: req.user?.id ?? 0,
    });

    res.json({ items: users });
  } catch (error) {
    next(error);
  }
});

userRouter.get(
  '/:userId/profile',
  optionalAuthenticate,
  async (req, res, next) => {
    try {
      const userId = parsePositiveInt(req.params.userId, 0);

      if (!userId) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '사용자 ID가 올바르지 않습니다.',
        );
      }

      const summary = await findFanSummaryById({
        userId,
        viewerUserId: req.user?.id ?? null,
      });

      if (!summary) {
        throw new HttpError(404, 'USER_NOT_FOUND', '팬을 찾을 수 없습니다.');
      }

      const [stats, recentPosts, sharedAttendanceCount] = await Promise.all([
        getAttendanceStats(userId),
        listRecentPostsByUser(userId),
        req.user?.id
          ? countSharedAttendanceGames({
              firstUserId: userId,
              secondUserId: req.user.id,
            })
          : Promise.resolve(0),
      ]);

      res.json({
        fan: {
          ...summary,
          stats: {
            totalCount: stats.totalCount,
            stadiumCount: stats.stadiumCount,
            homeCount: stats.homeCount,
            winRate: stats.overallWinRate,
            winCount: stats.overallWinCount,
            loseCount: stats.overallLoseCount,
            drawCount: stats.overallDrawCount,
            title: stats.title,
            titles: stats.titles,
          },
          sharedAttendanceCount,
          recentPosts,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

userRouter.post(
  '/:userId/follow',
  authenticate,
  followRateLimit,
  async (req, res, next) => {
    try {
      const followedUserId = parsePositiveInt(req.params.userId, 0);
      const followerUserId = req.user?.id ?? 0;

      if (!followedUserId) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '사용자 ID가 올바르지 않습니다.',
        );
      }

      if (followedUserId === followerUserId) {
        throw new HttpError(
          400,
          'CANNOT_FOLLOW_SELF',
          '내 프로필은 팔로우할 수 없습니다.',
        );
      }

      const [target, actor] = await Promise.all([
        findUserById(followedUserId),
        findUserById(followerUserId),
      ]);

      if (!target) {
        throw new HttpError(404, 'USER_NOT_FOUND', '팬을 찾을 수 없습니다.');
      }

      const created = await followUser({ followerUserId, followedUserId });

      if (created) {
        await createNotification({
          userId: followedUserId,
          actorUserId: followerUserId,
          type: 'user_followed',
          message: `${actor?.nickname ?? '한 팬'}님이 나를 팔로우했어요.`,
        });
      }

      const fan = await findFanSummaryById({
        userId: followedUserId,
        viewerUserId: followerUserId,
      });
      res.json({ fan });
    } catch (error) {
      next(error);
    }
  },
);

userRouter.delete('/:userId/follow', authenticate, async (req, res, next) => {
  try {
    const followedUserId = parsePositiveInt(req.params.userId, 0);
    const followerUserId = req.user?.id ?? 0;

    if (!followedUserId) {
      throw new HttpError(
        400,
        'INVALID_INPUT',
        '사용자 ID가 올바르지 않습니다.',
      );
    }

    await unfollowUser({ followerUserId, followedUserId });
    const fan = await findFanSummaryById({
      userId: followedUserId,
      viewerUserId: followerUserId,
    });
    res.json({ fan });
  } catch (error) {
    next(error);
  }
});
