import type { Response } from 'express';
import { env } from '../../config/env.js';

export const AUTH_COOKIE_NAME = 'yakuku_session';

function getCookieMaxAgeMs() {
  const value = env.jwt.expiresIn.trim();
  const match = value.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

export function setAuthCookie(
  res: Response,
  token: string,
  options: { rememberMe?: boolean } = {},
) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: options.rememberMe ? getCookieMaxAgeMs() : undefined,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
  });
}

export function readCookieHeader(cookieHeader: string | undefined, name: string) {
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
