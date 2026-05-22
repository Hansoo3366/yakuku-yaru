import { request } from './api';
import type { PublicUser } from './auth';

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type RegisterResponse = {
  user: PublicUser;
  verificationToken: string;
};

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function register(input: {
  email: string;
  password: string;
  nickname: string;
  favoriteTeamId?: number | null;
}) {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });
}

export function fetchMe(token: string) {
  return request<{ user: PublicUser }>('/auth/me', {
    token,
  });
}
