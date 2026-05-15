import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/http-error.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    next(new HttpError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', '유효하지 않은 토큰입니다.'));
  }
};
