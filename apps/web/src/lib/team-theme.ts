'use client';

import { useEffect } from 'react';

export const TEAM_COLOR_STORAGE_KEY = 'yakuku.teamColor';

export function applyTeamTheme(primaryColor: string | null | undefined) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (primaryColor) {
    root.style.setProperty('--team-color', primaryColor);
    root.style.setProperty('--team-color-soft', `${primaryColor}1f`);
    root.style.setProperty('--team-color-strong', `${primaryColor}cc`);
    try {
      window.localStorage.setItem(TEAM_COLOR_STORAGE_KEY, primaryColor);
    } catch {
      /* ignore */
    }
  } else {
    root.style.removeProperty('--team-color');
    root.style.removeProperty('--team-color-soft');
    root.style.removeProperty('--team-color-strong');
    try {
      window.localStorage.removeItem(TEAM_COLOR_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function useTeamTheme(primaryColor: string | null | undefined) {
  useEffect(() => {
    if (!primaryColor) return;
    applyTeamTheme(primaryColor);
  }, [primaryColor]);
}
