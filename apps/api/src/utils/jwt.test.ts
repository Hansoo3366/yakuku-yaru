import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { signAccessToken, verifyAccessToken } from './jwt.js';

const token = signAccessToken({ userId: 27, sessionVersion: 3 });
const payload = verifyAccessToken(token);

assert.equal(payload.userId, 27);
assert.equal(payload.sessionVersion, 3);
assert.equal(payload.tokenType, 'access');
assert.equal('email' in payload, false);

const wrongTypeToken = jwt.sign(
  { userId: 27, sessionVersion: 3, tokenType: 'refresh' },
  env.jwt.secret,
  {
    algorithm: 'HS256',
    audience: 'yakuku-yaru-web',
    issuer: 'yakuku-yaru-api',
  },
);

assert.throws(() => verifyAccessToken(wrongTypeToken), /Invalid access token/);

console.log('jwt.test.ts: ok');
