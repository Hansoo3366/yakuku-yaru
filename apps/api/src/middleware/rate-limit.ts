import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  scope: string;
  message?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 50_000;
let nextCleanupAt = 0;

function getClientKey(scope: string, req: Parameters<RequestHandler>[0]) {
  const userKey = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  return `${scope}:${userKey}`;
}

function cleanupExpiredBuckets(now: number) {
  if (now < nextCleanupAt && buckets.size < MAX_BUCKETS) return;

  nextCleanupAt = now + 60_000;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const key = getClientKey(options.scope, req);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + options.windowMs;
      buckets.set(key, {
        count: 1,
        resetAt,
      });
      res.setHeader('RateLimit-Limit', String(options.max));
      res.setHeader(
        'RateLimit-Remaining',
        String(Math.max(0, options.max - 1)),
      );
      res.setHeader('RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader(
      'RateLimit-Remaining',
      String(Math.max(0, options.max - bucket.count)),
    );
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      next(
        new HttpError(
          429,
          'RATE_LIMITED',
          options.message ?? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        ),
      );
      return;
    }

    next();
  };
}
