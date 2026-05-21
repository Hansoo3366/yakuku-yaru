import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { HttpError } from '../../utils/http-error.js';
import { deleteComment, findCommentById } from './comment.repository.js';

export const commentRouter = Router();

commentRouter.delete('/:commentId', authenticate, async (req, res, next) => {
  try {
    const comment = await findCommentById(Number(req.params.commentId));

    if (!comment) {
      throw new HttpError(404, 'COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.');
    }

    if (comment.user_id !== req.user?.id) {
      throw new HttpError(403, 'FORBIDDEN', '본인이 작성한 댓글만 삭제할 수 있습니다.');
    }

    await deleteComment(comment.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
