import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  userId: number;
  sessionVersion: number;
  tokenType: 'access';
};

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'yakuku-yaru-api';
const JWT_AUDIENCE = 'yakuku-yaru-web';

export function signAccessToken(
  payload: Omit<AccessTokenPayload, 'tokenType'>,
) {
  const signOptions: SignOptions = {
    expiresIn: env.jwt.accessExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign({ ...payload, tokenType: 'access' }, env.jwt.secret, {
    ...signOptions,
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, env.jwt.secret, {
    algorithms: [JWT_ALGORITHM],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  }) as AccessTokenPayload;

  if (
    payload.tokenType !== 'access' ||
    !Number.isInteger(payload.userId) ||
    !Number.isInteger(Number(payload.sessionVersion))
  ) {
    throw new Error('Invalid access token payload');
  }

  return payload;
}
