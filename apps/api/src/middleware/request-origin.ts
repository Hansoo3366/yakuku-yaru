import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function requestPublicOrigin(req: Parameters<RequestHandler>[0]) {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.header('host');

  return host ? normalizeOrigin(`${protocol}://${host}`) : null;
}

export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const fetchSite = req.header('sec-fetch-site');

  if (fetchSite === 'cross-site') {
    next(
      new HttpError(403, 'UNTRUSTED_ORIGIN', '허용되지 않은 요청 출처입니다.'),
    );
    return;
  }

  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = normalizeOrigin(req.header('origin'));
  const publicOrigin = requestPublicOrigin(req);

  if (
    origin &&
    (env.allowedOrigins.includes(origin) || origin === publicOrigin)
  ) {
    next();
    return;
  }

  if (!origin) {
    const refererOrigin = normalizeOrigin(req.header('referer'));
    const hasTrustedReferer =
      refererOrigin !== null &&
      (env.allowedOrigins.includes(refererOrigin) ||
        refererOrigin === publicOrigin);

    if (
      env.nodeEnv !== 'production' ||
      hasTrustedReferer ||
      fetchSite === 'same-origin' ||
      fetchSite === 'same-site'
    ) {
      next();
      return;
    }
  }

  next(
    new HttpError(403, 'UNTRUSTED_ORIGIN', '허용되지 않은 요청 출처입니다.'),
  );
};
