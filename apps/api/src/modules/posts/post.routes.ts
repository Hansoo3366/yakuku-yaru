import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
} from '../../middleware/authenticate.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { HttpError } from '../../utils/http-error.js';
import {
  validateCommentContent,
  validatePostContent,
  validatePostTitle,
} from '../../utils/user-input.js';
import {
  createPost,
  deletePost,
  findPostById,
  listPosts,
  toPostDetail,
  updatePost,
} from './post.repository.js';
import {
  createComment,
  listCommentsByPostId,
  toCommentItem,
} from '../comments/comment.repository.js';
import {
  createAdminNotifications,
  createNotification,
} from '../notifications/notification.repository.js';
import { findUserById } from '../users/user.repository.js';

export const postRouter = Router();

const POST_CATEGORIES = new Set([
  'review',
  'free',
  'info',
  'feature',
  'notice',
]);

function normalizePostCategory(value: unknown) {
  return typeof value === 'string' && POST_CATEGORIES.has(value)
    ? value
    : 'review';
}

async function assertCanUseModeration(
  userId: number,
  category: string,
  isPinned: boolean,
) {
  if (category !== 'notice' && !isPinned) return;

  const user = await findUserById(userId);
  if (user?.role !== 'admin') {
    throw new HttpError(
      403,
      'FORBIDDEN',
      '공지 작성과 상단 고정은 관리자만 사용할 수 있습니다.',
    );
  }
}

async function canModeratePosts(userId: number) {
  const user = await findUserById(userId);
  return user?.role === 'admin';
}

const createPostRateLimit = rateLimit({
  scope: 'posts:create',
  windowMs: 60 * 1000,
  max: 5,
  message: '게시글 작성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

const updatePostRateLimit = rateLimit({
  scope: 'posts:update',
  windowMs: 5 * 60 * 1000,
  max: 20,
});

const createCommentRateLimit = rateLimit({
  scope: 'comments:create',
  windowMs: 60 * 1000,
  max: 10,
  message: '댓글 작성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
});

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

postRouter.get('/', optionalAuthenticate, async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const size = Math.min(parsePositiveInt(req.query.size, 10), 50);
    const keyword =
      typeof req.query.keyword === 'string' && req.query.keyword.trim()
        ? req.query.keyword.trim().slice(0, 100)
        : undefined;
    const scope =
      req.query.scope === 'myTeam' || req.query.scope === 'following'
        ? req.query.scope
        : 'latest';
    const category =
      typeof req.query.category === 'string' &&
      POST_CATEGORIES.has(req.query.category)
        ? req.query.category
        : undefined;
    const result = await listPosts({
      page,
      size,
      keyword,
      category,
      scope,
      viewerUserId: req.user?.id ?? null,
    });
    const totalPages = Math.ceil(result.total / size);

    res.json({
      items: result.items,
      page,
      size,
      total: result.total,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

postRouter.post(
  '/',
  authenticate,
  createPostRateLimit,
  async (req, res, next) => {
    try {
      const {
        title,
        content,
        isPinned: requestedPinned,
      } = req.body as {
        title?: string;
        content?: string;
        category?: string;
        isPinned?: boolean;
      };

      const safeTitle = validatePostTitle(title ?? '');
      const safeContent = validatePostContent(content ?? '');

      if (!safeTitle || !safeContent) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '제목과 본문을 입력해주세요.',
        );
      }

      const userId = req.user?.id ?? 0;
      const category = normalizePostCategory(req.body?.category);
      const isPinned = requestedPinned === true;
      await assertCanUseModeration(userId, category, isPinned);

      const post = await createPost({
        userId,
        category,
        title: safeTitle,
        content: safeContent,
        isPinned,
      });

      if (!post) {
        throw new HttpError(
          500,
          'POST_CREATE_FAILED',
          '게시글 작성에 실패했습니다.',
        );
      }

      if (category === 'feature') {
        const actor = await findUserById(userId);
        await createAdminNotifications({
          actorUserId: userId,
          postId: post.id,
          type: 'feature_requested',
          message: `${actor?.nickname ?? '한 팬'}님이 기능 개선 요청을 등록했어요.`,
        });
      }

      res.status(201).json({
        post: toPostDetail(post),
      });
    } catch (error) {
      next(error);
    }
  },
);

postRouter.get('/:postId', async (req, res, next) => {
  try {
    const post = await findPostById(Number(req.params.postId));

    if (!post) {
      throw new HttpError(404, 'POST_NOT_FOUND', '게시글을 찾을 수 없습니다.');
    }

    res.json({
      post: toPostDetail(post),
    });
  } catch (error) {
    next(error);
  }
});

postRouter.patch(
  '/:postId',
  authenticate,
  updatePostRateLimit,
  async (req, res, next) => {
    try {
      const post = await findPostById(Number(req.params.postId));

      if (!post) {
        throw new HttpError(
          404,
          'POST_NOT_FOUND',
          '게시글을 찾을 수 없습니다.',
        );
      }

      if (post.user_id !== req.user?.id) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          '본인이 작성한 글만 수정할 수 있습니다.',
        );
      }

      const {
        title,
        content,
        category: requestedCategory,
        isPinned: requestedPinned,
      } = req.body as {
        title?: string;
        content?: string;
        category?: string;
        isPinned?: boolean;
      };

      const safeTitle = validatePostTitle(title ?? '');
      const safeContent = validatePostContent(content ?? '');

      if (!safeTitle || !safeContent) {
        throw new HttpError(
          400,
          'INVALID_INPUT',
          '제목과 본문을 입력해주세요.',
        );
      }

      const category = normalizePostCategory(
        requestedCategory ?? post.category,
      );
      const actorCanModerate = await canModeratePosts(req.user?.id ?? 0);

      if (
        !actorCanModerate &&
        (requestedCategory === 'notice' || requestedPinned === true)
      ) {
        throw new HttpError(
          403,
          'FORBIDDEN',
          '공지 작성과 상단 고정은 관리자만 사용할 수 있습니다.',
        );
      }

      const effectiveCategory =
        !actorCanModerate && post.category === 'notice'
          ? post.category
          : category;
      const isPinned = actorCanModerate
        ? typeof requestedPinned === 'boolean'
          ? requestedPinned
          : Boolean(post.is_pinned)
        : Boolean(post.is_pinned);

      const updatedPost = await updatePost({
        id: post.id,
        category: effectiveCategory,
        title: safeTitle,
        content: safeContent,
        isPinned,
      });

      res.json({
        post: updatedPost ? toPostDetail(updatedPost) : null,
      });
    } catch (error) {
      next(error);
    }
  },
);

postRouter.delete('/:postId', authenticate, async (req, res, next) => {
  try {
    const post = await findPostById(Number(req.params.postId));

    if (!post) {
      throw new HttpError(404, 'POST_NOT_FOUND', '게시글을 찾을 수 없습니다.');
    }

    if (post.user_id !== req.user?.id) {
      throw new HttpError(
        403,
        'FORBIDDEN',
        '본인이 작성한 글만 삭제할 수 있습니다.',
      );
    }

    await deletePost(post.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

postRouter.get('/:postId/comments', async (req, res, next) => {
  try {
    const post = await findPostById(Number(req.params.postId));

    if (!post) {
      throw new HttpError(404, 'POST_NOT_FOUND', '게시글을 찾을 수 없습니다.');
    }

    const comments = await listCommentsByPostId(post.id);

    res.json({
      items: comments,
    });
  } catch (error) {
    next(error);
  }
});

postRouter.post(
  '/:postId/comments',
  authenticate,
  createCommentRateLimit,
  async (req, res, next) => {
    try {
      const post = await findPostById(Number(req.params.postId));

      if (!post) {
        throw new HttpError(
          404,
          'POST_NOT_FOUND',
          '게시글을 찾을 수 없습니다.',
        );
      }

      const { content } = req.body as {
        content?: string;
      };

      const safeContent = validateCommentContent(content ?? '');

      if (!safeContent) {
        throw new HttpError(400, 'INVALID_INPUT', '댓글 내용을 입력해주세요.');
      }

      const comment = await createComment({
        postId: post.id,
        userId: req.user?.id ?? 0,
        content: safeContent,
      });

      if (comment && post.user_id !== req.user?.id) {
        await createNotification({
          userId: post.user_id,
          actorUserId: req.user?.id ?? null,
          postId: post.id,
          type: 'post_commented',
          message: `${comment.author_nickname}님이 내 글에 댓글을 남겼어요.`,
        });
      }

      res.status(201).json({
        comment: comment ? toCommentItem(comment) : null,
      });
    } catch (error) {
      next(error);
    }
  },
);
