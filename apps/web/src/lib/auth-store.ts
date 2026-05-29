'use client';

import { create } from 'zustand';
import {
  AUTH_LOGOUT_EVENT,
  COOKIE_SESSION_TOKEN,
  clearAccessToken,
  clearLegacyStoredAccessToken,
  setCookieSessionToken,
  setRootAuthState,
  type PublicUser,
} from '@/lib/auth';
import { logout } from '@/lib/auth-api';
import { applyTeamTheme } from '@/lib/team-theme';

type AuthState = {
  token: string | null;
  user: PublicUser | null;
  hasHydrated: boolean;
  hydrate: () => void;
  setSession: (input: { token?: string; user?: PublicUser | null }) => void;
  setUser: (user: PublicUser | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasHydrated: false,
  hydrate: () => {
    clearLegacyStoredAccessToken();
    setCookieSessionToken();
    set({ token: COOKIE_SESSION_TOKEN, hasHydrated: true });
  },
  setSession: ({ user }) => {
    setCookieSessionToken();
    setRootAuthState('authed');
    set({ token: COOKIE_SESSION_TOKEN, user: user ?? null, hasHydrated: true });
  },
  setUser: (user) => {
    set({ user });
  },
  clearSession: () => {
    void logout().catch(() => undefined);
    clearAccessToken();
    applyTeamTheme(null);
    setRootAuthState('guest');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
    }
    set({ token: null, user: null, hasHydrated: true });
  },
}));
