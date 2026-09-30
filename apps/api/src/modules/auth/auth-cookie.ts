import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { durationToMs } from '../../utils/duration.js';

export const ACCESS_COOKIE_NAME = 'yakuku_access';
export const REFRESH_COOKIE_NAME = 'yakuku_refresh';
/**
 * 비밀값 없는 "로그인해 있음" 표시. 인증 쿠키는 path 가 /api 로 제한되고 HttpOnly 라
 * 웹 서버 렌더링과 브라우저 JS 가 로그인 여부를 알 수 없다. 이 표시가 없으면 웹은 비로그인으로 보고
 * /auth/me·/auth/refresh 를 보내지 않는다. 권한 판단에는 절대 쓰지 않는다.
 */
export const SIGNED_IN_COOKIE_NAME = 'yakuku_signed_in';
const LEGACY_AUTH_COOKIE_NAME = 'yakuku_session';

const sharedCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
};

const signedInCookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: env.nodeEnv === 'production',
  path: '/',
};

function setSignedInCookie(res: Response, maxAge: number | undefined) {
  res.cookie(SIGNED_IN_COOKIE_NAME, '1', { ...signedInCookieOptions, maxAge });
}

/** 표시 쿠키가 생기기 전부터 로그인해 있던 세션에도 표시를 붙인다. */
export function ensureSignedInCookie(req: Request, res: Response) {
  if (!readCookieHeader(req.headers.cookie, SIGNED_IN_COOKIE_NAME)) {
    setSignedInCookie(res, undefined);
  }
}

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
  const maxAge = options.rememberMe
    ? Math.max(0, options.expiresAt.getTime() - Date.now())
    : undefined;

  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...sharedCookieOptions,
    maxAge,
    path: '/api/auth',
  });
  // 로그인 유지 기간을 리프레시 쿠키와 같게 맞춘다.
  setSignedInCookie(res, maxAge);
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
  res.clearCookie(SIGNED_IN_COOKIE_NAME, signedInCookieOptions);
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
