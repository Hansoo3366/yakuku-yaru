'use client';

import { useLayoutEffect } from 'react';
import {
  getAccessibleTeamSurface,
  getContrastingTextColor,
  getLightenedTeamColor,
  getTeamColorOnDark,
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
    // 글자색은 바탕에 따라 달라야 하므로 밝은 면용·어두운 면용을 따로 넘기고, CSS 가 테마에 맞는 쪽을 고른다.
    root.style.setProperty('--team-ink-light', accessibleSurface);
    root.style.setProperty('--team-ink-dark', getTeamColorOnDark(safeColor, 7));
    // 다크 모드에서 헤더 아래 표시(선·점·배지)에 쓰는 팀 컬러. 헤더 자체는 원래 색을 쓴다.
    const accentOnDark = getTeamColorOnDark(safeColor, 3);
    root.style.setProperty('--team-accent-dark', accentOnDark);
    root.style.setProperty(
      '--team-accent-dark-contrast',
      getContrastingTextColor(accentOnDark),
    );
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
    root.style.removeProperty('--team-ink-light');
    root.style.removeProperty('--team-ink-dark');
    root.style.removeProperty('--team-accent-dark');
    root.style.removeProperty('--team-accent-dark-contrast');
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
