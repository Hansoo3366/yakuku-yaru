'use client';

const ACCESS_TOKEN_KEY = 'yakuku.accessToken';

export type PublicUser = {
  id: number;
  email: string;
  nickname: string;
  favoriteTeamId: number | null;
  emailVerifiedAt: string | null;
};

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}
