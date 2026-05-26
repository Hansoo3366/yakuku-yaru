import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
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
import { createNotification } from '../notifications/notification.repository.js';

export const postRouter = Router();

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

postRouter.get('/', async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const size = Math.min(parsePositiveInt(req.query.size, 10), 50);
    const keyword =
      typeof req.query.keyword === 'string' && req.query.keyword.trim()
        ? req.query.keyword.trim()
        : undefined;
    const result = await listPosts({ page, size, keyword });
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

postRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, content } = req.body as {
      title?: string;
      content?: string;
    };

    const safeTitle = validatePostTitle(title ?? '');
    const safeContent = validatePostContent(content ?? '');

    if (!safeTitle || !safeContent) {
      throw new HttpError(400, 'INVALID_INPUT', '제목과 본문을 입력해주세요.');
    }

    const post = await createPost({
      userId: req.user?.id ?? 0,
      title: safeTitle,
      content: safeContent,
    });

    if (!post) {
      throw new HttpError(500, 'POST_CREATE_FAILED', '게시글 작성에 실패했습니다.');
    }

    res.status(201).json({
      post: toPostDetail(post),
    });
  } catch (error) {
    next(error);
  }
});

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

postRouter.patch('/:postId', authenticate, async (req, res, next) => {
  try {
    const post = await findPostById(Number(req.params.postId));

    if (!post) {
      throw new HttpError(404, 'POST_NOT_FOUND', '게시글을 찾을 수 없습니다.');
    }

    if (post.user_id !== req.user?.id) {
      throw new HttpError(403, 'FORBIDDEN', '본인이 작성한 글만 수정할 수 있습니다.');
    }

    const { title, content } = req.body as {
      title?: string;
      content?: string;
    };

    const safeTitle = validatePostTitle(title ?? '');
    const safeContent = validatePostContent(content ?? '');

    if (!safeTitle || !safeContent) {
      throw new HttpError(400, 'INVALID_INPUT', '제목과 본문을 입력해주세요.');
    }

    const updatedPost = await updatePost({
      id: post.id,
      title: safeTitle,
      content: safeContent,
    });

    res.json({
      post: updatedPost ? toPostDetail(updatedPost) : null,
    });
  } catch (error) {
    next(error);
  }
});

postRouter.delete('/:postId', authenticate, async (req, res, next) => {
  try {
    const post = await findPostById(Number(req.params.postId));

    if (!post) {
      throw new HttpError(404, 'POST_NOT_FOUND', '게시글을 찾을 수 없습니다.');
    }

    if (post.user_id !== req.user?.id) {
      throw new HttpError(403, 'FORBIDDEN', '본인이 작성한 글만 삭제할 수 있습니다.');
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

postRouter.post('/:postId/comments', authenticate, async (req, res, next) => {
  try {
    const post = await findPostById(Number(req.params.postId));

    if (!post) {
      throw new HttpError(404, 'POST_NOT_FOUND', '게시글을 찾을 수 없습니다.');
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
});
