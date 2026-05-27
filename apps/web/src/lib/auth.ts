'use client';

import { applyTeamTheme } from '@/lib/team-theme';

const ACCESS_TOKEN_KEY = 'yakuku.accessToken';

export const AUTH_LOGOUT_EVENT = 'yakuku:auth:logout';

export type PublicUser = {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  role: string;
  favoriteTeamId: number | null;
  favoriteTeamShortName: string | null;
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

export function setRootAuthState(state: 'authed' | 'guest') {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.authState = state;
  }
}

export function performLogout(router: { replace: (href: string) => void }) {
  clearAccessToken();
  applyTeamTheme(null);
  setRootAuthState('guest');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
  }
  router.replace('/');
}
