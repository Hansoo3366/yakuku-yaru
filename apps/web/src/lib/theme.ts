/** 화면 모드(라이트/다크). layout.tsx 의 부트 스크립트가 같은 키와 규칙으로 첫 paint 전에 적용한다. */
export const THEME_STORAGE_KEY = 'yakuku.theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: '시스템 설정',
  light: '라이트',
  dark: '다크',
};

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);

    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 선택을 <html data-theme> 에 반영한다. 색은 전부 CSS 토큰이 이 속성을 보고 바꾼다. */
export function applyThemePreference(preference: ThemePreference) {
  const isDark =
    preference === 'dark' || (preference === 'system' && systemPrefersDark());

  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // 저장소를 못 쓰면 이번 방문에만 적용된다.
  }

  applyThemePreference(preference);
}
