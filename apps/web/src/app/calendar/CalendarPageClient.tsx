'use client';

import './calendar.css';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CalendarAgendaView } from '@/components/CalendarAgendaView';
import {
  CalendarFilterBar,
  getCalendarViewAnchorDate,
} from '@/components/CalendarFilterBar';
import type { CalendarEventVariant } from '@/components/CalendarEventCard';
import type { CalendarOutcomeFilter } from '@/components/CalendarOutcomeLegend';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import {
  buildCalendarSummaryItems,
  getCalendarEmptyStateCopy,
  resolveDefaultScheduleFilter,
  shiftAnchor,
} from '@/lib/calendar-data';
import {
  formatDateInput,
  formatWeekLabel,
  getKoreaToday,
  getMonthStart,
  getWeekStart,
} from '@/lib/calendar-range';
import { useMediaQuery } from '@/lib/use-media-query';
import { useAuthStore } from '@/lib/auth-store';
import {
  type CalendarScheduleFilter,
  type CalendarViewMode,
  type CalendarWatchTypeFilter,
  useCalendarUiStore,
} from '@/lib/calendar-ui-store';
import { useMeQuery } from '@/lib/queries';
import { CalendarGrid } from './CalendarGrid';
import { CalendarStatsRail } from './CalendarStatsRail';
import { useCalendarData } from './useCalendarData';
import { useScrollToFocusedDay } from './useScrollToFocusedDay';

export default function CalendarPage() {
  const viewMode = useCalendarUiStore((state) => state.viewMode);
  const setViewMode = useCalendarUiStore((state) => state.setViewMode);
  const scheduleFilter = useCalendarUiStore((state) => state.scheduleFilter);
  const setScheduleFilter = useCalendarUiStore(
    (state) => state.setScheduleFilter,
  );
  const watchTypeFilter = useCalendarUiStore((state) => state.watchTypeFilter);
  const setWatchTypeFilter = useCalendarUiStore(
    (state) => state.setWatchTypeFilter,
  );
  const hasAppliedDefaultScheduleFilter = useCalendarUiStore(
    (state) => state.hasAppliedDefaultScheduleFilter,
  );
  const markDefaultScheduleFilterApplied = useCalendarUiStore(
    (state) => state.markDefaultScheduleFilterApplied,
  );
  const [anchorDate, setAnchorDate] = useState(() =>
    // 서버(UTC)와 브라우저가 같은 달을 그리도록 한국 시간 기준 오늘에서 시작한다.
    getCalendarViewAnchorDate(viewMode, getKoreaToday()),
  );
  const [todayJumpTick, setTodayJumpTick] = useState(0);
  const [agendaFocusDateKey, setAgendaFocusDateKey] = useState<string | null>(
    null,
  );
  const [outcomeFilter, setOutcomeFilter] =
    useState<CalendarOutcomeFilter>('all');
  const isMobile = useMediaQuery('(max-width: 720px)');
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const meQuery = useMeQuery(token);
  const user = meQuery.data?.user ?? storedUser;
  const favoriteTeamId = user?.favoriteTeamId ?? null;
  const isAuthed = Boolean(token && user && !meQuery.isError);
  const effectiveScheduleFilter: CalendarScheduleFilter = isAuthed
    ? scheduleFilter
    : 'all';
  const effectiveWatchTypeFilter: CalendarWatchTypeFilter = isAuthed
    ? watchTypeFilter
    : 'all';
  const effectiveFavoriteTeamId = isAuthed ? favoriteTeamId : null;

  useEffect(() => {
    if (meQuery.isError) {
      clearSession();
    }
  }, [clearSession, meQuery.isError]);

  useEffect(() => {
    if (!effectiveFavoriteTeamId && outcomeFilter !== 'all') {
      setOutcomeFilter('all');
    }
  }, [effectiveFavoriteTeamId, outcomeFilter]);

  useEffect(() => {
    if (!isAuthed || !meQuery.data?.user || hasAppliedDefaultScheduleFilter) {
      return;
    }

    setScheduleFilter(
      resolveDefaultScheduleFilter(meQuery.data.user.favoriteTeamId),
    );
    markDefaultScheduleFilterApplied();
  }, [
    hasAppliedDefaultScheduleFilter,
    isAuthed,
    markDefaultScheduleFilterApplied,
    meQuery.data?.user,
    setScheduleFilter,
  ]);

  const {
    monthStart,
    weekStart,
    days,
    statsYear,
    favoriteTeam,
    favoriteTeamStanding,
    isLoading,
    outcomeCounts,
    displayGamesByDate,
    displayGameCount,
    attendanceByDate,
    attendanceRecordsByGameId,
    periodRecordCount,
    stats,
  } = useCalendarData({
    viewMode,
    anchorDate,
    token,
    isAuthed,
    isSessionLoading: Boolean(token) && meQuery.isLoading,
    scheduleFilter: effectiveScheduleFilter,
    watchTypeFilter: effectiveWatchTypeFilter,
    outcomeFilter,
    favoriteTeamId: effectiveFavoriteTeamId,
  });

  function handleScheduleFilterChange(filter: CalendarScheduleFilter) {
    if (!isAuthed) {
      return;
    }

    setScheduleFilter(filter);
    if (filter === 'all') {
      setWatchTypeFilter('all');
      setOutcomeFilter('all');
    }
  }

  function handleWatchTypeFilterChange(filter: CalendarWatchTypeFilter) {
    if (!isAuthed) {
      return;
    }

    setWatchTypeFilter(filter);
  }

  function handleOutcomeFilterChange(filter: CalendarOutcomeFilter) {
    if (!isAuthed || !effectiveFavoriteTeamId) {
      return;
    }

    if (filter !== 'all' && effectiveScheduleFilter === 'all') {
      setScheduleFilter('favorite');
    }

    setOutcomeFilter(filter);
  }

  // 월간에서 리그 전체를 볼 때는 하루 다섯 경기가 한 칸에 들어가므로 한 줄 표기를 쓴다.
  const monthEventVariant: CalendarEventVariant =
    effectiveScheduleFilter === 'all' ? 'line' : 'cell';

  function selectDay(date: Date, dateKey: string) {
    setAgendaFocusDateKey(dateKey);
    setViewMode('week');
    setAnchorDate(getWeekStart(date));
  }

  const toolbarTitle =
    viewMode === 'month'
      ? `${anchorDate.getFullYear()}년 ${String(anchorDate.getMonth() + 1).padStart(2, '0')}월`
      : formatWeekLabel(weekStart);

  function goToToday() {
    const today = getKoreaToday();
    const todayKey = formatDateInput(today);

    setAgendaFocusDateKey(todayKey);
    setAnchorDate(
      viewMode === 'month' ? getMonthStart(today) : getWeekStart(today),
    );
    setTodayJumpTick((current) => current + 1);
  }

  useScrollToFocusedDay({
    focusDateKey: agendaFocusDateKey,
    isMobile,
    isLoading,
    todayJumpTick,
    anchorDate,
    displayGamesByDate,
  });

  const summaryItems = buildCalendarSummaryItems({
    isAuthed,
    scheduleFilter: effectiveScheduleFilter,
    favoriteTeamShortName: favoriteTeam?.shortName ?? null,
    hasFavoriteTeam: Boolean(favoriteTeam),
    displayGameCount,
    periodRecordCount,
    standing: favoriteTeamStanding,
  });
  const emptyStateCopy = getCalendarEmptyStateCopy({
    outcomeFilter,
    watchTypeFilter: effectiveWatchTypeFilter,
    scheduleFilter: effectiveScheduleFilter,
    viewMode,
  });
  const changeViewMode = (mode: CalendarViewMode) => {
    setViewMode(mode);
    setAnchorDate(getCalendarViewAnchorDate(mode, anchorDate));
  };

  return (
    <main className="app-shell app-shell--calendar with-bottom-nav">
      <header className="cal-head">
        <div className="cal-head__title">
          <h1 id="calendar-title">
            <span className="sr-only">
              {favoriteTeam
                ? `${favoriteTeam.shortName} 직관 캘린더 `
                : 'KBO 야구 일정 캘린더 '}
            </span>
            {toolbarTitle}
          </h1>
        </div>
        <div aria-label="기간 이동" className="cal-head__nav" role="group">
          <button
            aria-label={viewMode === 'month' ? '이전 달' : '이전 주'}
            onClick={() => {
              setAgendaFocusDateKey(null);
              setAnchorDate((current) => shiftAnchor(current, viewMode, -1));
            }}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
          <button
            aria-label={viewMode === 'month' ? '다음 달' : '다음 주'}
            onClick={() => {
              setAgendaFocusDateKey(null);
              setAnchorDate((current) => shiftAnchor(current, viewMode, 1));
            }}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={20} />
          </button>
          <button className="cal-head__today" onClick={goToToday} type="button">
            오늘
          </button>
        </div>
      </header>

      <dl className="cal-summary">
        {summaryItems.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <CalendarFilterBar
        favoriteTeamId={effectiveFavoriteTeamId}
        onOutcomeFilterChange={handleOutcomeFilterChange}
        onScheduleFilterChange={handleScheduleFilterChange}
        onViewModeChange={changeViewMode}
        onWatchTypeFilterChange={handleWatchTypeFilterChange}
        outcomeCounts={outcomeCounts}
        outcomeFilter={outcomeFilter}
        publicScheduleOnly={!isAuthed}
        scheduleFilter={effectiveScheduleFilter}
        viewMode={viewMode}
        watchTypeFilter={effectiveWatchTypeFilter}
      />

      <div className={`cal-layout${isAuthed ? ' cal-layout--with-rail' : ''}`}>
        <div className="cal-main">
          {isLoading ? (
            <Skeleton
              height={isMobile ? 360 : viewMode === 'week' ? 520 : 620}
              radius={10}
            />
          ) : isMobile ? (
            <CalendarAgendaView
              attendanceByDate={attendanceByDate}
              attendanceRecordsByGameId={attendanceRecordsByGameId}
              days={days}
              favoriteTeamId={effectiveFavoriteTeamId}
              focusDateKey={agendaFocusDateKey}
              gamesByDate={displayGamesByDate}
              referenceMonth={viewMode === 'month' ? monthStart : undefined}
              showOutsideDays={viewMode === 'week'}
            />
          ) : (
            <CalendarGrid
              attendanceByDate={attendanceByDate}
              attendanceRecordsByGameId={attendanceRecordsByGameId}
              days={days}
              favoriteTeamId={effectiveFavoriteTeamId}
              focusDateKey={agendaFocusDateKey}
              gamesByDate={displayGamesByDate}
              monthEventVariant={monthEventVariant}
              monthStart={monthStart}
              onSelectDay={selectDay}
              viewMode={viewMode}
            />
          )}

          {!isLoading && displayGameCount === 0 ? (
            <EmptyState
              icon="◌"
              title={emptyStateCopy.title}
              description={emptyStateCopy.description}
            />
          ) : null}
        </div>

        {isAuthed ? (
          <CalendarStatsRail
            favoriteTeamShortName={favoriteTeam?.shortName ?? null}
            hasFavoriteTeam={Boolean(effectiveFavoriteTeamId)}
            stats={stats}
            statsYear={statsYear}
          />
        ) : null}
      </div>
    </main>
  );
}
