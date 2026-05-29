'use client';

import { applyTeamTheme } from '@/lib/team-theme';

export const AUTH_LOGOUT_EVENT = 'yakuku:auth:logout';
export const COOKIE_SESSION_TOKEN = 'cookie-session';

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

let currentSessionToken: string | null = null;

export function clearLegacyStoredAccessToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('yakuku.accessToken');
  }
}

export function getAccessToken() {
  return currentSessionToken;
}

export function setCookieSessionToken() {
  currentSessionToken = COOKIE_SESSION_TOKEN;
}

export function clearAccessToken() {
  currentSessionToken = null;
}

export function shouldSendAuthorizationHeader(token: string | null | undefined) {
  return Boolean(token && token !== COOKIE_SESSION_TOKEN);
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
