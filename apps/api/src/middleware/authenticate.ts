import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/http-error.js';
import {
  AUTH_COOKIE_NAME,
  readCookieHeader,
} from '../modules/auth/auth-cookie.js';
import { findUserSessionStateById } from '../modules/users/user.repository.js';

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

export const authenticate: RequestHandler = async (req, _res, next) => {
  const authorization = req.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  const cookieToken = readCookieHeader(req.header('cookie'), AUTH_COOKIE_NAME);
  const accessToken = scheme === 'Bearer' && token ? token : cookieToken;

  if (!accessToken) {
    next(new HttpError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.'));
    return;
  }

  try {
    const payload = verifyAccessToken(accessToken);
    const sessionState = await findUserSessionStateById(payload.userId);

    if (
      !sessionState ||
      Number(sessionState.session_version) !== Number(payload.sessionVersion)
    ) {
      throw new Error('Session has been revoked');
    }

    req.user = {
      id: payload.userId,
      email: sessionState.email,
    };

    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', '유효하지 않은 토큰입니다.'));
  }
};

export const optionalAuthenticate: RequestHandler = async (req, _res, next) => {
  const authorization = req.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  const cookieToken = readCookieHeader(req.header('cookie'), AUTH_COOKIE_NAME);
  const accessToken = scheme === 'Bearer' && token ? token : cookieToken;

  if (!accessToken) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(accessToken);
    const sessionState = await findUserSessionStateById(payload.userId);

    if (
      !sessionState ||
      Number(sessionState.session_version) !== Number(payload.sessionVersion)
    ) {
      next();
      return;
    }
    req.user = {
      id: payload.userId,
      email: sessionState.email,
    };
  } catch {
    // Public endpoints remain available when a stale optional session is sent.
  }

  next();
};
