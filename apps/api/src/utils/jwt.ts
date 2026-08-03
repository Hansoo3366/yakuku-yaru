import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  userId: number;
  email: string;
  sessionVersion: number;
};

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'yakuku-yaru-api';
const JWT_AUDIENCE = 'yakuku-yaru-web';

export function signAccessToken(
  payload: AccessTokenPayload,
  options: { rememberMe?: boolean } = {},
) {
  const signOptions: SignOptions = {
    expiresIn: (options.rememberMe
      ? env.jwt.rememberExpiresIn
      : env.jwt.expiresIn) as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.jwt.secret, {
    ...signOptions,
    algorithm: JWT_ALGORITHM,
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwt.secret, {
    algorithms: [JWT_ALGORITHM],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  }) as AccessTokenPayload;
}
