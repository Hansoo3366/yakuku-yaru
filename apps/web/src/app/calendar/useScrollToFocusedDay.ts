'use client';

import { useEffect } from 'react';
import {
  getAgendaDayElementId,
  scrollAgendaDayIntoView,
} from '@/lib/calendar-range';

type UseScrollToFocusedDayInput = {
  focusDateKey: string | null;
  isMobile: boolean;
  isLoading: boolean;
  /** 「오늘」을 누를 때마다 늘어난다. 데스크톱은 이 값이 바뀔 때만 스크롤한다. */
  todayJumpTick: number;
  /** 아래 두 값이 바뀌어 화면이 다시 그려지면 다시 맞춘다. */
  anchorDate: Date;
  displayGamesByDate: unknown;
};

/**
 * 고른 날짜로 스크롤한다. 모바일은 목록의 그 날짜 블록을, 데스크톱은 「오늘」 버튼을 눌렀을 때
 * 달력 칸을 화면 가운데로 가져온다. 그리기가 끝난 뒤에 재도록 두 프레임 기다린다.
 */
export function useScrollToFocusedDay({
  focusDateKey,
  isMobile,
  isLoading,
  todayJumpTick,
  anchorDate,
  displayGamesByDate,
}: UseScrollToFocusedDayInput) {
  useEffect(() => {
    if (!isMobile || isLoading || !focusDateKey) {
      return;
    }

    let cancelled = false;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        const element = document.getElementById(
          getAgendaDayElementId(focusDateKey),
        );

        if (element) {
          scrollAgendaDayIntoView(element);
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [focusDateKey, isMobile, isLoading, anchorDate, displayGamesByDate]);

  useEffect(() => {
    if (isMobile || isLoading || !focusDateKey || todayJumpTick === 0) {
      return;
    }

    let cancelled = false;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        const element = document.getElementById(`calendar-day-${focusDateKey}`);

        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'smooth' });
          element.focus({ preventScroll: true });
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [
    focusDateKey,
    anchorDate,
    displayGamesByDate,
    isLoading,
    isMobile,
    todayJumpTick,
  ]);
}
