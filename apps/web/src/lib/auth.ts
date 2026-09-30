'use client';

import { SIGNED_IN_COOKIE_NAME } from '@/lib/auth-cookie-name';
import { applyTeamTheme } from '@/lib/team-theme';

export const AUTH_LOGOUT_EVENT = 'yakuku:auth:logout';
/**
 * 실제 자격 증명이 아니다. 인증은 HttpOnly 쿠키로만 하고, 스토어의 token 에는 로그인 상태를 뜻하는
 * 이 값만 들어간다. API 함수와 쿼리 키가 받는 token 은 "로그인했을 때만 요청한다"는 조건으로 쓰인다.
 */
export const COOKIE_SESSION_TOKEN = 'cookie-session';
const SESSION_PROBED_STORAGE_KEY = 'yakuku.sessionProbed.v1';

export function hasSignedInCookie() {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith(`${SIGNED_IN_COOKIE_NAME}=`));
}

/**
 * 표시 쿠키가 없으면 비로그인으로 보고 /auth/me 를 보내지 않는다.
 * 다만 표시 쿠키가 도입되기 전에 로그인한 세션은 쿠키가 없으므로, 브라우저마다 한 번은 확인한다.
 * 확인이 성공하면 API 가 표시 쿠키를 붙여 준다.
 */
export function shouldCheckSession() {
  if (hasSignedInCookie()) {
    return true;
  }

  try {
    if (window.localStorage.getItem(SESSION_PROBED_STORAGE_KEY)) {
      return false;
    }
    window.localStorage.setItem(SESSION_PROBED_STORAGE_KEY, '1');
  } catch {
    // 저장소를 못 쓰면 확인 여부를 기억할 수 없으니 예전처럼 매번 확인한다.
    return true;
  }

  return true;
}

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

let authExpiredHandler: (() => void) | null = null;

export function clearLegacyStoredAccessToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('yakuku.accessToken');
  }
}

export function registerAuthExpiredHandler(handler: () => void) {
  authExpiredHandler = handler;
}

export function notifyAuthExpired() {
  if (authExpiredHandler) {
    authExpiredHandler();
    return;
  }

  applyTeamTheme(null);
  setRootAuthState('guest');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
  }
}

export function setRootAuthState(state: 'authed' | 'guest') {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.authState = state;
  }
}
