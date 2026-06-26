import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  userId: number;
  email: string;
};

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
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwt.secret) as AccessTokenPayload;
}
