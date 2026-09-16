import type { Response } from 'express';
import { env } from '../../config/env.js';
import { durationToMs } from '../../utils/duration.js';

export const ACCESS_COOKIE_NAME = 'yakuku_access';
export const REFRESH_COOKIE_NAME = 'yakuku_refresh';
const LEGACY_AUTH_COOKIE_NAME = 'yakuku_session';

const sharedCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
};

export function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...sharedCookieOptions,
    maxAge: durationToMs(env.jwt.accessExpiresIn),
    path: '/api',
  });
}

export function setRefreshCookie(
  res: Response,
  token: string,
  options: { rememberMe: boolean; expiresAt: Date },
) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...sharedCookieOptions,
    maxAge: options.rememberMe
      ? Math.max(0, options.expiresAt.getTime() - Date.now())
      : undefined,
    path: '/api/auth',
  });
}

export function setAuthCookies(
  res: Response,
  input: {
    accessToken: string;
    refreshToken: string;
    rememberMe: boolean;
    refreshExpiresAt: Date;
  },
) {
  setAccessCookie(res, input.accessToken);
  setRefreshCookie(res, input.refreshToken, {
    rememberMe: input.rememberMe,
    expiresAt: input.refreshExpiresAt,
  });
  res.clearCookie(LEGACY_AUTH_COOKIE_NAME, {
    ...sharedCookieOptions,
    path: '/',
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    ...sharedCookieOptions,
    path: '/api',
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...sharedCookieOptions,
    path: '/api/auth',
  });
  res.clearCookie(LEGACY_AUTH_COOKIE_NAME, {
    ...sharedCookieOptions,
    path: '/',
  });
}

export function readCookieHeader(
  cookieHeader: string | undefined,
  name: string,
) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');

    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}
