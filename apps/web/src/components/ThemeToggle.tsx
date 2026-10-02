'use client';

import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  THEME_LABELS,
  THEME_PREFERENCES,
  applyThemePreference,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/lib/theme';

const ICONS: Record<ThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

/** 화면 모드 전환 버튼. 누를 때마다 시스템 설정 → 라이트 → 다크 순으로 바뀐다. */
export function ThemeToggle({ className }: { className?: string }) {
  // 서버 HTML 과 맞추기 위해 처음에는 'system' 으로 그리고, 마운트 뒤 저장된 선택을 읽는다.
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreference(readThemePreference());
  }, []);

  // '시스템 설정'일 때는 OS 의 밝기 설정이 바뀌면 바로 따라간다.
  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => applyThemePreference('system');

    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [preference]);

  function handleClick() {
    const next =
      THEME_PREFERENCES[
        (THEME_PREFERENCES.indexOf(preference) + 1) % THEME_PREFERENCES.length
      ];

    setPreference(next);
    saveThemePreference(next);
  }

  const Icon = ICONS[preference];

  return (
    <button
      aria-label={`화면 모드: ${THEME_LABELS[preference]}. 눌러서 바꾸기`}
      className={className}
      onClick={handleClick}
      type="button"
    >
      <Icon aria-hidden="true" size={15} />
      화면 모드: {THEME_LABELS[preference]}
    </button>
  );
}
