import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const PROXY_HEADER = 'x-yakuku-proxy-key';

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export const requireTrustedProxy: RequestHandler = (req, _res, next) => {
  if (!env.proxySharedSecret) {
    next();
    return;
  }

  const received = req.header(PROXY_HEADER) ?? '';

  if (!secretsMatch(received, env.proxySharedSecret)) {
    next(new HttpError(404, 'NOT_FOUND', '요청한 경로를 찾을 수 없습니다.'));
    return;
  }

  next();
};
