'use client';

import { useLayoutEffect } from 'react';
import {
  getAccessibleTeamSurface,
  getContrastingTextColor,
  getLightenedTeamColor,
  normalizeTeamColor,
} from '@/lib/team-color';

export const TEAM_COLOR_STORAGE_KEY = 'yakuku.teamColor';
export const TEAM_SURFACE_STORAGE_KEY = 'yakuku.teamSurface';
export const TEAM_CONTRAST_STORAGE_KEY = 'yakuku.teamContrast';
export const TEAM_DISPLAY_STORAGE_KEY = 'yakuku.teamDisplay';
export const TEAM_DISPLAY_CONTRAST_STORAGE_KEY = 'yakuku.teamDisplayContrast';

export function applyTeamTheme(primaryColor: string | null | undefined) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const safeColor = normalizeTeamColor(primaryColor);

  if (safeColor) {
    const accessibleSurface = getAccessibleTeamSurface(safeColor);
    const contrastingText = getContrastingTextColor(safeColor);
    const displayColor = getLightenedTeamColor(safeColor);
    const displayContrastingText = getContrastingTextColor(displayColor);

    root.style.setProperty('--team-color', safeColor);
    root.style.setProperty('--team-color-soft', `${safeColor}1f`);
    root.style.setProperty('--team-color-strong', `${safeColor}cc`);
    root.style.setProperty('--team-color-ink', accessibleSurface);
    root.style.setProperty('--team-color-surface', accessibleSurface);
    root.style.setProperty('--team-color-contrast', contrastingText);
    root.style.setProperty('--team-color-display', displayColor);
    root.style.setProperty(
      '--team-color-display-contrast',
      displayContrastingText,
    );
    try {
      window.localStorage.setItem(TEAM_COLOR_STORAGE_KEY, safeColor);
      window.localStorage.setItem(TEAM_SURFACE_STORAGE_KEY, accessibleSurface);
      window.localStorage.setItem(TEAM_CONTRAST_STORAGE_KEY, contrastingText);
      window.localStorage.setItem(TEAM_DISPLAY_STORAGE_KEY, displayColor);
      window.localStorage.setItem(
        TEAM_DISPLAY_CONTRAST_STORAGE_KEY,
        displayContrastingText,
      );
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
    root.style.removeProperty('--team-color-display');
    root.style.removeProperty('--team-color-display-contrast');
    try {
      window.localStorage.removeItem(TEAM_COLOR_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_SURFACE_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_CONTRAST_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_DISPLAY_STORAGE_KEY);
      window.localStorage.removeItem(TEAM_DISPLAY_CONTRAST_STORAGE_KEY);
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
