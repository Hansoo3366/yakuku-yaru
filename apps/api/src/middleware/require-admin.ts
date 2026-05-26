import type { RequestHandler } from 'express';
import { findUserById } from '../modules/users/user.repository.js';
import { HttpError } from '../utils/http-error.js';

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const user = await findUserById(req.user?.id ?? 0);

    if (!user || user.role !== 'admin') {
      next(new HttpError(403, 'ADMIN_REQUIRED', '관리자 권한이 필요합니다.'));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
