import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

  const origin = req.header('origin');

  if (origin && env.allowedOrigins.includes(origin)) {
    next();
    return;
  }

  if (!origin && env.nodeEnv !== 'production') {
    next();
    return;
  }

  next(
    new HttpError(403, 'UNTRUSTED_ORIGIN', '허용되지 않은 요청 출처입니다.'),
  );
};
