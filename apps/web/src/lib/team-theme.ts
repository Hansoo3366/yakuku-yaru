'use client';

import { useLayoutEffect } from 'react';
import { getAccessibleTeamSurface } from '@/lib/team-color';

export const TEAM_COLOR_STORAGE_KEY = 'yakuku.teamColor';
export const TEAM_SURFACE_STORAGE_KEY = 'yakuku.teamSurface';

export function applyTeamTheme(primaryColor: string | null | undefined) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (primaryColor) {
    const accessibleSurface = getAccessibleTeamSurface(primaryColor);

    root.style.setProperty('--team-color', primaryColor);
    root.style.setProperty('--team-color-soft', `${primaryColor}1f`);
    root.style.setProperty('--team-color-strong', `${primaryColor}cc`);
    root.style.setProperty('--team-color-surface', accessibleSurface);
    try {
      window.localStorage.setItem(TEAM_COLOR_STORAGE_KEY, primaryColor);
      window.localStorage.setItem(
        TEAM_SURFACE_STORAGE_KEY,
        accessibleSurface,
      );
    } catch {
      /* ignore */
    }
  } else {
    root.style.removeProperty('--team-color');
    root.style.removeProperty('--team-color-soft');
    root.style.removeProperty('--team-color-strong');
    root.style.removeProperty('--team-color-surface');
    try {
      window.localStorage.removeItem(TEAM_COLOR_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_SURFACE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function useTeamTheme(primaryColor: string | null | undefined) {
  useLayoutEffect(() => {
    applyTeamTheme(primaryColor);
  }, [primaryColor]);
}
