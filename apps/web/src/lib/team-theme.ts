'use client';

import { useLayoutEffect } from 'react';
import {
  getAccessibleTeamSurface,
  getContrastingTextColor,
} from '@/lib/team-color';

export const TEAM_COLOR_STORAGE_KEY = 'yakuku.teamColor';
export const TEAM_SURFACE_STORAGE_KEY = 'yakuku.teamSurface';
export const TEAM_CONTRAST_STORAGE_KEY = 'yakuku.teamContrast';

export function applyTeamTheme(primaryColor: string | null | undefined) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (primaryColor) {
    const accessibleSurface = getAccessibleTeamSurface(primaryColor);
    const contrastingText = getContrastingTextColor(primaryColor);

    root.style.setProperty('--team-color', primaryColor);
    root.style.setProperty('--team-color-soft', `${primaryColor}1f`);
    root.style.setProperty('--team-color-strong', `${primaryColor}cc`);
    root.style.setProperty('--team-color-ink', accessibleSurface);
    root.style.setProperty('--team-color-surface', accessibleSurface);
    root.style.setProperty('--team-color-contrast', contrastingText);
    try {
      window.localStorage.setItem(TEAM_COLOR_STORAGE_KEY, primaryColor);
      window.localStorage.setItem(TEAM_SURFACE_STORAGE_KEY, accessibleSurface);
      window.localStorage.setItem(TEAM_CONTRAST_STORAGE_KEY, contrastingText);
    } catch {
      /* ignore */
    }
  } else {
    root.style.removeProperty('--team-color');
    root.style.removeProperty('--team-color-soft');
    root.style.removeProperty('--team-color-strong');
    root.style.removeProperty('--team-color-ink');
    root.style.removeProperty('--team-color-surface');
    root.style.removeProperty('--team-color-contrast');
    try {
      window.localStorage.removeItem(TEAM_COLOR_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_SURFACE_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_CONTRAST_STORAGE_KEY);
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
