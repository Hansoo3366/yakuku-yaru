import { formatKoreanTime } from '@/lib/date-format';

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAgendaDayElementId(dateKey: string) {
  return `calendar-agenda-${dateKey}`;
}

/** 하단 GNB·「오늘」 FAB 위 visible 영역 안으로 날짜 블록 스크롤 */
export function scrollAgendaDayIntoView(element: HTMLElement) {
  const styles = getComputedStyle(document.documentElement);
  const bottomNavHeight =
    Number.parseFloat(styles.getPropertyValue('--bottom-nav-height')) || 72;
  const topInset = 16;
  const bottomInset = bottomNavHeight + 88;

  const rect = element.getBoundingClientRect();
  const availableHeight = window.innerHeight - topInset - bottomInset;
  const targetCenter = topInset + availableHeight / 2;
  const elementCenter = rect.top + rect.height / 2;
  const scrollTop = Math.max(0, window.scrollY + elementCenter - targetCenter);

  window.scrollTo({ top: scrollTop, behavior: 'smooth' });
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

export function getMonthRange(month: Date) {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export function getYearRange(year: number) {
  const from = new Date(year, 0, 1);
  const to = new Date(year + 1, 0, 1);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export type ScheduleFilter = 'favorite' | 'favorite-home' | 'all';

type GameTeamsLike = {
  homeTeam: { id: number };
  awayTeam: { id: number };
};

export function isGameInScheduleFilter(
  game: GameTeamsLike,
  scheduleFilter: ScheduleFilter,
  favoriteTeamId: number | null | undefined,
) {
  if (scheduleFilter === 'all') {
    return true;
  }

  if (!favoriteTeamId) {
    return false;
  }

  const teamId = Number(favoriteTeamId);
  const isHome = Number(game.homeTeam.id) === teamId;
  const isAway = Number(game.awayTeam.id) === teamId;

  if (scheduleFilter === 'favorite-home') {
    return isHome;
  }

  return isHome || isAway;
}

export function isDateInMonth(date: Date, month: Date) {
  return (
    date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
  );
}

export function getWeekRange(weekStart: Date) {
  const from = new Date(weekStart);
  const to = new Date(weekStart);
  to.setDate(to.getDate() + 7);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

export function getCalendarMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const lastOffset = 6 - lastDay.getDay();
  const totalDays = startOffset + lastDay.getDate() + lastOffset;
  const length = totalDays > 35 ? 42 : 35;

  return Array.from({ length }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

export function isSameDay(a: Date, b: Date) {
  return formatDateInput(a) === formatDateInput(b);
}

export function formatGameTime(gameDate: string) {
  const date = new Date(gameDate);
  if (Number.isNaN(date.getTime())) return '';
  return formatKoreanTime(date);
}

export function formatWeekLabel(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = `${weekStart.getMonth() + 1}.${String(weekStart.getDate()).padStart(2, '0')}`;
  const endLabel = sameMonth
    ? String(weekEnd.getDate()).padStart(2, '0')
    : `${weekEnd.getMonth() + 1}.${String(weekEnd.getDate()).padStart(2, '0')}`;
  return `${weekStart.getFullYear()}.${startLabel} – ${endLabel}`;
}
