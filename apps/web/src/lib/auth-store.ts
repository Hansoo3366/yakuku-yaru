'use client';

import { create } from 'zustand';
import {
  AUTH_LOGOUT_EVENT,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setRootAuthState,
  type PublicUser,
} from '@/lib/auth';
import { applyTeamTheme } from '@/lib/team-theme';

type AuthState = {
  token: string | null;
  user: PublicUser | null;
  hasHydrated: boolean;
  hydrate: () => void;
  setSession: (input: { token: string; user?: PublicUser | null }) => void;
  setUser: (user: PublicUser | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasHydrated: false,
  hydrate: () => {
    const token = getAccessToken();
    setRootAuthState(token ? 'authed' : 'guest');
    set({ token, hasHydrated: true });
  },
  setSession: ({ token, user }) => {
    setAccessToken(token);
    setRootAuthState('authed');
    set({ token, user: user ?? null, hasHydrated: true });
  },
  setUser: (user) => {
    set({ user });
  },
  clearSession: () => {
    clearAccessToken();
    applyTeamTheme(null);
    setRootAuthState('guest');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
    }
    set({ token: null, user: null, hasHydrated: true });
  },
}));
