'use client';

import './calendar.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Game } from '@/lib/baseball-api';
import { type AttendanceRecord } from '@/lib/attendance-api';
import { CalendarAgendaView } from '@/components/CalendarAgendaView';
import {
  CalendarFilterBar,
  getCalendarViewAnchorDate,
} from '@/components/CalendarFilterBar';
import { CalendarEventCard } from '@/components/CalendarEventCard';
import type {
  CalendarOutcomeCounts,
  CalendarOutcomeFilter,
} from '@/components/CalendarOutcomeLegend';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { getStadiumAttendanceOpponentInsights } from '@/lib/calendar-opponent-insights';
import { OpponentInsightRanking } from '@/components/OpponentInsightRanking';
import {
  formatWinRateLabel,
  getHomeAttendanceWinRate,
  getStadiumAttendanceWinRate,
} from '@/lib/calendar-win-rates';
import {
  getKboFavoriteTeamSeasonWinRate,
  getKboOpponentWinRateInsights,
} from '@/lib/kbo-season-insights';
import {
  formatDateInput,
  formatWeekLabel,
  getAgendaDayElementId,
  getCalendarMonthDays,
  scrollAgendaDayIntoView,
  getMonthRange,
  getMonthStart,
  getWeekDays,
  getWeekRange,
  getWeekStart,
  getYearRange,
  isGameInScheduleFilter,
  isSameDay,
} from '@/lib/calendar-range';
import {
  countsTowardWinRate,
  isNeutralAttendance,
} from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import { getFavoriteTeamGameOutcome } from '@/lib/game-outcome';
import { useMediaQuery } from '@/lib/use-media-query';
import { useAuthStore } from '@/lib/auth-store';
import {
  type CalendarScheduleFilter,
  type CalendarViewMode,
  type CalendarWatchTypeFilter,
  useCalendarUiStore,
} from '@/lib/calendar-ui-store';
import {
  useAttendanceRecordsQuery,
  useGamesQuery,
  useMeQuery,
  useTeamsQuery,
  useTeamStandingsQuery,
} from '@/lib/queries';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

function resolveScheduleFilter(
  favoriteTeamId: number | null | undefined,
): CalendarScheduleFilter {
  return favoriteTeamId ? 'favorite' : 'all';
}

function gameFromAttendanceRecord(
  record: AttendanceRecord,
  gamesById: Map<number, Game>,
): Game {
  const existing = gamesById.get(record.gameId);

  if (existing) {
    return existing;
  }

  return {
    id: record.gameId,
    gameDate: record.game.gameDate,
    stadium: record.game.stadium,
    homeTeam: record.game.homeTeam as Game['homeTeam'],
    awayTeam: record.game.awayTeam as Game['awayTeam'],
    homeScore: record.game.homeScore,
    awayScore: record.game.awayScore,
    status: record.game.status,
    cancellationReason: null,
    lineupConfirmed: null,
    probablePitchers: { home: null, away: null },
    lineups: { home: [], away: [] },
    ticketUrl: null,
    ticketOpenAt: null,
    stadiumGuide: null,
  };
}

function groupAttendanceRecordsByGame(records: AttendanceRecord[]) {
  const groups = new Map<number, AttendanceRecord[]>();

  for (const record of records) {
    groups.set(record.gameId, [...(groups.get(record.gameId) ?? []), record]);
  }

  return [...groups.values()];
}

function shiftAnchor(date: Date, viewMode: CalendarViewMode, amount: number) {
  if (viewMode === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return getWeekStart(next);
}

function formatRecentTenLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, '');
  const match = normalized.match(/^(\d+승)(\d+무)(\d+패)$/);

  if (!match) {
    return value;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getStreakKind(value: string | null | undefined) {
  if (!value) {
    return 'none';
  }

  if (value.includes('승')) {
    return 'win';
  }

  if (value.includes('패')) {
    return 'lose';
  }

  if (value.includes('무')) {
    return 'draw';
  }

  return 'none';
}

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
    getCalendarViewAnchorDate(viewMode, new Date()),
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

  const monthStart = useMemo(() => getMonthStart(anchorDate), [anchorDate]);
  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const range = useMemo(
    () =>
      viewMode === 'month'
        ? getMonthRange(monthStart)
        : getWeekRange(weekStart),
    [viewMode, monthStart, weekStart],
  );
  const statsYear = anchorDate.getFullYear();
  const yearRange = useMemo(() => getYearRange(statsYear), [statsYear]);

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

    setScheduleFilter(resolveScheduleFilter(meQuery.data.user.favoriteTeamId));
    markDefaultScheduleFilterApplied();
  }, [
    hasAppliedDefaultScheduleFilter,
    isAuthed,
    markDefaultScheduleFilterApplied,
    meQuery.data?.user,
    setScheduleFilter,
  ]);

  const activeTeamId =
    effectiveScheduleFilter !== 'all'
      ? (effectiveFavoriteTeamId ?? undefined)
      : undefined;
  const teamsQuery = useTeamsQuery();
  const gamesQuery = useGamesQuery(
    { ...range, teamId: activeTeamId },
    { enabled: true },
  );
  const attendanceRecordsQuery = useAttendanceRecordsQuery(range, token, {
    enabled: isAuthed,
  });
  const yearAttendanceRecordsQuery = useAttendanceRecordsQuery(
    yearRange,
    token,
    { enabled: isAuthed },
  );
  const teamStandingsQuery = useTeamStandingsQuery(statsYear, {
    enabled: isAuthed,
  });
  const yearSeasonGamesQuery = useGamesQuery(
    { ...yearRange, teamId: effectiveFavoriteTeamId ?? undefined },
    { enabled: Boolean(isAuthed && effectiveFavoriteTeamId) },
  );
  const teams = teamsQuery.data?.items ?? [];
  const rawGames = useMemo(
    () => gamesQuery.data?.items ?? [],
    [gamesQuery.data?.items],
  );
  const games = useMemo(
    () =>
      rawGames.filter((game) =>
        isGameInScheduleFilter(
          game,
          effectiveScheduleFilter,
          effectiveFavoriteTeamId,
        ),
      ),
    [rawGames, effectiveScheduleFilter, effectiveFavoriteTeamId],
  );
  const attendanceRecords = useMemo(
    () => attendanceRecordsQuery.data?.items ?? [],
    [attendanceRecordsQuery.data?.items],
  );
  const yearAttendanceRecords = useMemo(
    () => yearAttendanceRecordsQuery.data?.items ?? [],
    [yearAttendanceRecordsQuery.data?.items],
  );
  const teamStandings = teamStandingsQuery.data ?? null;
  const yearSeasonGames = useMemo(
    () => yearSeasonGamesQuery.data?.items ?? [],
    [yearSeasonGamesQuery.data?.items],
  );
  const isLoading =
    (Boolean(token) && meQuery.isLoading) ||
    teamsQuery.isLoading ||
    gamesQuery.isLoading ||
    (isAuthed && attendanceRecordsQuery.isLoading);

  const filteredAttendanceRecords = useMemo(() => {
    if (effectiveWatchTypeFilter === 'all') {
      return attendanceRecords;
    }

    return attendanceRecords.filter(
      (record) => record.watchType === effectiveWatchTypeFilter,
    );
  }, [attendanceRecords, effectiveWatchTypeFilter]);

  const scheduleScopedAttendanceRecords = useMemo(
    () =>
      filteredAttendanceRecords.filter(
        (record) =>
          isGameInScheduleFilter(
            record.game,
            effectiveScheduleFilter,
            effectiveFavoriteTeamId,
          ) || isNeutralAttendance(record.game, effectiveFavoriteTeamId),
      ),
    [
      filteredAttendanceRecords,
      effectiveScheduleFilter,
      effectiveFavoriteTeamId,
    ],
  );

  const outcomeScopedAttendanceRecords = useMemo(() => {
    if (outcomeFilter === 'all') {
      return scheduleScopedAttendanceRecords;
    }

    return scheduleScopedAttendanceRecords.filter((record) => {
      const outcome =
        resolveAttendanceOutcome(record, effectiveFavoriteTeamId) ??
        getFavoriteTeamGameOutcome(record.game, effectiveFavoriteTeamId);

      return outcome === outcomeFilter;
    });
  }, [
    scheduleScopedAttendanceRecords,
    outcomeFilter,
    effectiveFavoriteTeamId,
  ]);

  const periodRecords = useMemo(() => {
    const fromMs = new Date(`${range.from}T00:00:00`).getTime();
    const toMs = new Date(`${range.to}T00:00:00`).getTime();

    return outcomeScopedAttendanceRecords.filter((record) => {
      const ms = new Date(record.game.gameDate).getTime();
      return ms >= fromMs && ms < toMs;
    });
  }, [outcomeScopedAttendanceRecords, range.from, range.to]);

  const statsAttendanceRecords = useMemo(() => {
    const byId = new Map<number, AttendanceRecord>();

    for (const record of yearAttendanceRecords) {
      byId.set(record.id, record);
    }

    for (const record of attendanceRecords) {
      const recordYear = new Date(record.game.gameDate).getFullYear();

      if (recordYear === statsYear) {
        byId.set(record.id, record);
      }
    }

    return [...byId.values()].filter((record) =>
      countsTowardWinRate(record.game, effectiveFavoriteTeamId),
    );
  }, [
    yearAttendanceRecords,
    attendanceRecords,
    statsYear,
    effectiveFavoriteTeamId,
  ]);

  const yearStadiumWinRate = useMemo(
    () =>
      getStadiumAttendanceWinRate(statsAttendanceRecords, effectiveFavoriteTeamId),
    [statsAttendanceRecords, effectiveFavoriteTeamId],
  );
  const yearHomeWinRate = useMemo(
    () =>
      getHomeAttendanceWinRate(statsAttendanceRecords, effectiveFavoriteTeamId),
    [statsAttendanceRecords, effectiveFavoriteTeamId],
  );
  const yearTeamWinRate = useMemo(
    () => getKboFavoriteTeamSeasonWinRate(teamStandings, effectiveFavoriteTeamId),
    [teamStandings, effectiveFavoriteTeamId],
  );
  const opponentInsights = useMemo(() => {
    const kbo = getKboOpponentWinRateInsights(
      yearSeasonGames,
      effectiveFavoriteTeamId,
    );
    const stadium = getStadiumAttendanceOpponentInsights(
      statsAttendanceRecords,
      effectiveFavoriteTeamId,
    );

    return {
      teamWinRateHigh: kbo.high,
      stadiumWinRateHigh: stadium.high,
    };
  }, [yearSeasonGames, statsAttendanceRecords, effectiveFavoriteTeamId]);

  const favoriteTeamStanding = useMemo(() => {
    if (!effectiveFavoriteTeamId || !teamStandings?.items.length) {
      return null;
    }

    return (
      teamStandings.items.find((item) => item.teamId === effectiveFavoriteTeamId) ??
      null
    );
  }, [teamStandings, effectiveFavoriteTeamId]);

  const gamesByDate = useMemo(
    () =>
      games.reduce<Record<string, Game[]>>((acc, game) => {
        const key = game.gameDate.slice(0, 10);
        acc[key] = [...(acc[key] ?? []), game];
        return acc;
      }, {}),
    [games],
  );

  const gamesById = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );

  const attendanceRecordsByGameId = useMemo(
    () =>
      scheduleScopedAttendanceRecords.reduce<Record<number, AttendanceRecord[]>>(
        (acc, record) => {
          acc[record.gameId] = [...(acc[record.gameId] ?? []), record];
          return acc;
        },
        {},
      ),
    [scheduleScopedAttendanceRecords],
  );

  const baseDisplayGamesByDate = useMemo(() => {
    if (effectiveWatchTypeFilter === 'all') {
      return gamesByDate;
    }

    const result: Record<string, Game[]> = {};

    for (const record of scheduleScopedAttendanceRecords) {
      const key = record.game.gameDate.slice(0, 10);
      const game = gameFromAttendanceRecord(record, gamesById);
      const dayGames = result[key] ?? [];

      if (!dayGames.some((item) => item.id === game.id)) {
        result[key] = [...dayGames, game];
      }
    }

    return result;
  }, [
    effectiveWatchTypeFilter,
    gamesByDate,
    scheduleScopedAttendanceRecords,
    gamesById,
  ]);

  const resolveGameOutcome = useCallback(
    (game: Game) => {
      const attendance = attendanceRecordsByGameId[game.id]?.[0] ?? null;

      return attendance
        ? (resolveAttendanceOutcome(attendance, effectiveFavoriteTeamId) ??
            getFavoriteTeamGameOutcome(game, effectiveFavoriteTeamId))
        : getFavoriteTeamGameOutcome(game, effectiveFavoriteTeamId);
    },
    [attendanceRecordsByGameId, effectiveFavoriteTeamId],
  );

  const outcomeCounts = useMemo<CalendarOutcomeCounts>(() => {
    const counts: CalendarOutcomeCounts = {
      win: 0,
      lose: 0,
      draw: 0,
      cancelled: 0,
      scheduled: 0,
    };
    const countedGameIds = new Set<number>();

    for (const dayGames of Object.values(baseDisplayGamesByDate)) {
      for (const game of dayGames) {
        if (countedGameIds.has(game.id)) {
          continue;
        }

        countedGameIds.add(game.id);
        const outcome = resolveGameOutcome(game);

        if (outcome !== 'unknown') {
          counts[outcome] += 1;
        }
      }
    }

    return counts;
  }, [baseDisplayGamesByDate, resolveGameOutcome]);

  const displayGamesByDate = useMemo<Record<string, Game[]>>(() => {
    if (outcomeFilter === 'all') {
      return baseDisplayGamesByDate;
    }

    const result: Record<string, Game[]> = {};

    for (const [key, dayGames] of Object.entries(baseDisplayGamesByDate)) {
      const filteredGames = dayGames.filter(
        (game) => resolveGameOutcome(game) === outcomeFilter,
      );

      if (filteredGames.length > 0) {
        result[key] = filteredGames;
      }
    }

    return result;
  }, [baseDisplayGamesByDate, outcomeFilter, resolveGameOutcome]);

  const displayGameCount = useMemo(() => {
    return Object.values(displayGamesByDate).reduce(
      (total, dayGames) => total + dayGames.length,
      0,
    );
  }, [displayGamesByDate]);

  const attendanceByDate = useMemo(
    () =>
      outcomeScopedAttendanceRecords.reduce<Record<string, AttendanceRecord[]>>(
        (acc, record) => {
          const key = record.game.gameDate.slice(0, 10);
          acc[key] = [...(acc[key] ?? []), record];
          return acc;
        },
        {},
      ),
    [outcomeScopedAttendanceRecords],
  );

  const days =
    viewMode === 'month'
      ? getCalendarMonthDays(monthStart)
      : getWeekDays(weekStart);

  const favoriteTeam = teams.find((team) => team.id === effectiveFavoriteTeamId);

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

  function renderDayCell(
    date: Date,
    options: { dense: boolean; inMonth: boolean },
  ) {
    const key = formatDateInput(date);
    const dayGames = displayGamesByDate[key] ?? [];
    const dayRecords = attendanceByDate[key] ?? [];
    const visibleGameIds = new Set(dayGames.map((game) => game.id));
    const extraRecordGroups = groupAttendanceRecordsByGame(
      dayRecords.filter((record) => !visibleGameIds.has(record.gameId)),
    );
    const isOutside = !options.inMonth;
    const isToday = isSameDay(date, new Date());
    const dayOfWeek = date.getDay();
    const classNames = [
      'calendar-day',
      viewMode === 'week' ? 'calendar-day--week' : '',
      isOutside ? 'is-outside' : '',
      isToday ? 'is-today' : '',
      agendaFocusDateKey === key ? 'is-focused-day' : '',
      dayRecords.length ? 'has-record' : '',
      dayOfWeek === 0 ? 'is-sunday' : '',
      dayOfWeek === 6 ? 'is-saturday' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        className={classNames}
        id={`calendar-day-${key}`}
        key={key}
        aria-current={isToday ? 'date' : undefined}
        tabIndex={-1}
      >
        <button
          aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 주간 보기`}
          className="calendar-day-number"
          onClick={() => {
            setAgendaFocusDateKey(key);
            setViewMode('week');
            setAnchorDate(getWeekStart(date));
          }}
          title="이 날짜의 주간 일정 보기"
          type="button"
        >
          {date.getDate()}
        </button>
        <div className="calendar-events">
          {dayGames.map((game) => {
            const gameAttendanceRecords =
              attendanceRecordsByGameId[game.id] ?? [];
            const attendance = gameAttendanceRecords[0] ?? null;
            const href = `/games/${game.id}`;

            return (
              <CalendarEventCard
                attendance={attendance}
                attendanceRecords={gameAttendanceRecords}
                dense={options.dense}
                favoriteTeamId={effectiveFavoriteTeamId}
                game={game}
                href={href}
                key={game.id}
              />
            );
          })}
          {extraRecordGroups.map((records) => {
            const record = records[0];

            if (!record) {
              return null;
            }

            return (
              <CalendarEventCard
                attendance={record}
                attendanceRecords={records}
                dense={options.dense}
                favoriteTeamId={effectiveFavoriteTeamId}
                game={{
                  id: record.gameId,
                  gameDate: record.game.gameDate,
                  stadium: record.game.stadium,
                  homeTeam: record.game.homeTeam,
                  awayTeam: record.game.awayTeam,
                  homeScore: record.game.homeScore,
                  awayScore: record.game.awayScore,
                  status: record.game.status,
                  cancellationReason: null,
                  probablePitchers: { home: null, away: null },
                }}
                href={`/games/${record.gameId}`}
                key={`record-group-${record.gameId}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const toolbarTitle =
    viewMode === 'month'
      ? `${anchorDate.getFullYear()}년 ${String(anchorDate.getMonth() + 1).padStart(2, '0')}월`
      : formatWeekLabel(weekStart);

  function goToToday() {
    const today = new Date();
    const todayKey = formatDateInput(today);

    setAgendaFocusDateKey(todayKey);
    setAnchorDate(
      viewMode === 'month' ? getMonthStart(today) : getWeekStart(today),
    );
    setTodayJumpTick((current) => current + 1);
  }

  useEffect(() => {
    if (!isMobile || isLoading || !agendaFocusDateKey) {
      return;
    }

    let cancelled = false;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        const element = document.getElementById(
          getAgendaDayElementId(agendaFocusDateKey),
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
  }, [agendaFocusDateKey, isMobile, isLoading, anchorDate, displayGamesByDate]);

  useEffect(() => {
    if (isMobile || isLoading || !agendaFocusDateKey || todayJumpTick === 0) {
      return;
    }

    let cancelled = false;

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }

        const element = document.getElementById(
          `calendar-day-${agendaFocusDateKey}`,
        );

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
    agendaFocusDateKey,
    anchorDate,
    displayGamesByDate,
    isLoading,
    isMobile,
    todayJumpTick,
  ]);

  const periodLabel = viewMode === 'month' ? '이번 달' : '이번 주';
  const showTeamWinRate = Boolean(effectiveFavoriteTeamId);
  const teamRateLabel = favoriteTeam
    ? `우리팀(${favoriteTeam.shortName}) 승률`
    : null;
  const favoriteRankLabel = favoriteTeamStanding
    ? `${favoriteTeamStanding.rank}위`
    : favoriteTeam
      ? '—'
      : null;
  const favoriteRecentTenLabel = formatRecentTenLabel(
    favoriteTeamStanding?.recentTen ?? null,
  );
  const favoriteStreakLabel = favoriteTeamStanding?.streak ?? null;
  const outcomeEmptyLabel =
    outcomeFilter === 'win'
      ? '승리'
      : outcomeFilter === 'lose'
        ? '패배'
        : outcomeFilter === 'draw'
          ? '무승부'
          : outcomeFilter === 'cancelled'
            ? '취소된'
            : outcomeFilter === 'scheduled'
              ? '예정된'
              : null;

  return (
    <main
      className={`app-shell app-shell--calendar with-bottom-nav${
        isMobile ? ' has-calendar-filter-dock' : ''
      }`}
    >
      <section
        className={`calendar-overview${
          isAuthed ? '' : ' calendar-overview--public'
        }`}
        aria-labelledby="calendar-title"
      >
        <header className="app-page-header">
          <span className="eyebrow">{anchorDate.getFullYear()} Season</span>
          <h1 id="calendar-title">
            {favoriteTeam
              ? `${favoriteTeam.shortName} 직관 캘린더`
              : 'KBO 야구 일정 캘린더'}
          </h1>
          <p>
            {isAuthed && user?.nickname
              ? `${user.nickname}님의 ${viewMode === 'month' ? '월간' : '주간'} 일정과 기록`
              : '로그인 없이 KBO 전체 팀 경기 일정과 프로야구 캘린더를 확인하세요.'}
          </p>
        </header>

        {isAuthed ? (
          <section
            className={`calendar-summary-row${
              favoriteRankLabel ? '' : ' calendar-summary-row--duo'
            }`}
            aria-label="기간 요약"
          >
            <div className="calendar-summary-card">
              <span>{periodLabel} 경기</span>
              <strong>
                {displayGameCount}
                <small>경기</small>
              </strong>
            </div>
            <div className="calendar-summary-card">
              <span>기록한 경기</span>
              <strong>
                {periodRecords.length}
                <small>회</small>
              </strong>
            </div>
            {favoriteRankLabel ? (
              <div className="calendar-summary-card">
                <span>{favoriteTeam?.shortName ?? '우리팀'} 순위</span>
                <strong>{favoriteRankLabel}</strong>
                {favoriteRecentTenLabel || favoriteStreakLabel ? (
                  <div className="calendar-summary-trends">
                    {favoriteRecentTenLabel ? (
                      <span className="calendar-summary-trend-chip">
                        <span className="calendar-summary-trend-label">
                          최근 10경기
                        </span>
                        <strong>{favoriteRecentTenLabel}</strong>
                      </span>
                    ) : null}
                    {favoriteStreakLabel ? (
                      <span
                        className="calendar-summary-trend-chip"
                        data-kind={getStreakKind(favoriteStreakLabel)}
                      >
                        <span className="calendar-summary-trend-label">
                          연속
                        </span>
                        <strong>{favoriteStreakLabel}</strong>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </section>

      <div
        className={`calendar-main-layout${
          !isMobile ? ' calendar-main-layout--with-rails' : ''
        }${isAuthed ? '' : ' calendar-main-layout--public'}`}
      >
        {!isMobile ? (
          <aside aria-label="캘린더 필터" className="calendar-filter-rail">
            <CalendarFilterBar
              favoriteTeamId={effectiveFavoriteTeamId}
              layout="rail"
              onOutcomeFilterChange={handleOutcomeFilterChange}
              onScheduleFilterChange={handleScheduleFilterChange}
              onViewModeChange={(mode) => {
                setViewMode(mode);
                setAnchorDate(getCalendarViewAnchorDate(mode, anchorDate));
              }}
              onWatchTypeFilterChange={handleWatchTypeFilterChange}
              publicScheduleOnly={!isAuthed}
              outcomeCounts={outcomeCounts}
              outcomeFilter={outcomeFilter}
              scheduleFilter={effectiveScheduleFilter}
              viewMode={viewMode}
              watchTypeFilter={effectiveWatchTypeFilter}
            />
          </aside>
        ) : null}

        <div className="calendar-primary-column">
          <div className="calendar-toolbar-sticky">
            <section aria-label="기간 이동" className="calendar-toolbar">
              <button
                aria-label={viewMode === 'month' ? '이전 달' : '이전 주'}
                className="icon-button"
                onClick={() => {
                  setAgendaFocusDateKey(null);
                  setAnchorDate((current) =>
                    shiftAnchor(current, viewMode, -1),
                  );
                }}
                type="button"
              >
                ←
              </button>
              <div className="calendar-month-label">
                <small>
                  {viewMode === 'month' ? '월간 일정' : '주간 일정'} ·{' '}
                  {displayGameCount}경기
                </small>
                <span>{toolbarTitle}</span>
              </div>
              <button
                aria-label={viewMode === 'month' ? '다음 달' : '다음 주'}
                className="icon-button"
                onClick={() => {
                  setAgendaFocusDateKey(null);
                  setAnchorDate((current) => shiftAnchor(current, viewMode, 1));
                }}
                type="button"
              >
                →
              </button>
              <button
                className="calendar-today-button"
                onClick={goToToday}
                type="button"
              >
                오늘
              </button>
            </section>
          </div>

          {isLoading ? (
            <div className="card">
              <Skeleton
                height={isMobile ? 360 : viewMode === 'week' ? 520 : 420}
                radius={10}
              />
            </div>
          ) : isMobile ? (
            <>
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
              <CalendarFilterBar
                favoriteTeamId={effectiveFavoriteTeamId}
                layout="mobile"
                onOutcomeFilterChange={handleOutcomeFilterChange}
                onScheduleFilterChange={handleScheduleFilterChange}
                onViewModeChange={(mode) => {
                  setViewMode(mode);
                  setAnchorDate(getCalendarViewAnchorDate(mode, anchorDate));
                }}
                onWatchTypeFilterChange={handleWatchTypeFilterChange}
                publicScheduleOnly={!isAuthed}
                outcomeCounts={outcomeCounts}
                outcomeFilter={outcomeFilter}
                scheduleFilter={effectiveScheduleFilter}
                viewMode={viewMode}
                watchTypeFilter={effectiveWatchTypeFilter}
              />
            </>
          ) : (
            <section
              className={`calendar-card${viewMode === 'week' ? ' calendar-card--week' : ''}`}
              aria-label={viewMode === 'month' ? '월간 캘린더' : '주간 캘린더'}
            >
              <div className="calendar-weekdays" aria-hidden="true">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {days.map((date) =>
                  renderDayCell(date, {
                    dense: viewMode === 'month',
                    inMonth:
                      viewMode === 'week' ||
                      date.getMonth() === monthStart.getMonth(),
                  }),
                )}
              </div>
            </section>
          )}

          {!isLoading && displayGameCount === 0 ? (
            <EmptyState
              icon="◌"
              title={
                outcomeEmptyLabel
                  ? viewMode === 'month'
                    ? `이번 달엔 ${outcomeEmptyLabel} 경기가 없어요`
                    : `이번 주엔 ${outcomeEmptyLabel} 경기가 없어요`
                  : effectiveWatchTypeFilter === 'all'
                  ? effectiveScheduleFilter === 'favorite-home'
                    ? viewMode === 'month'
                      ? '이번 달엔 홈구장 경기가 없어요'
                      : '이번 주엔 홈구장 경기가 없어요'
                    : viewMode === 'month'
                      ? '이번 달엔 경기 일정이 없어요'
                      : '이번 주엔 경기 일정이 없어요'
                  : effectiveWatchTypeFilter === 'stadium'
                    ? '이번 기간에 직관 기록이 없어요'
                    : '이번 기간에 집관 기록이 없어요'
              }
              description={
                outcomeEmptyLabel
                  ? '다른 경기 결과를 선택하거나 기간을 이동해보세요.'
                  : effectiveWatchTypeFilter === 'all'
                  ? effectiveScheduleFilter === 'favorite-home'
                    ? '원정 경기는 「응원팀」으로 확인해보세요.'
                    : '다른 기간으로 이동해보세요.'
                  : '직관 기록을 남기거나 다른 기간을 확인해보세요.'
              }
            />
          ) : null}
        </div>

        {isAuthed ? (
          <aside className="calendar-insight-rail" aria-label="승률 요약">
            <section className="calendar-win-rate-panel">
            <div className="calendar-win-rate-group">
              <h2 className="calendar-win-rate-heading">
                {statsYear}년<small>연간 승률</small>
              </h2>
              <div
                className={`calendar-summary-row calendar-summary-row--rates${
                  showTeamWinRate ? ' calendar-summary-row--trio' : ''
                }`}
              >
                <div className="calendar-summary-card">
                  <span>직관 승률</span>
                  <strong>{formatWinRateLabel(yearStadiumWinRate)}</strong>
                </div>
                <div className="calendar-summary-card">
                  <span>집관 승률</span>
                  <strong>{formatWinRateLabel(yearHomeWinRate)}</strong>
                </div>
                {showTeamWinRate && teamRateLabel ? (
                  <div className="calendar-summary-card">
                    <span>{teamRateLabel}</span>
                    <strong>{formatWinRateLabel(yearTeamWinRate)}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            {showTeamWinRate ? (
              <div className="calendar-win-rate-group">
                <h2 className="calendar-win-rate-heading">상대 팀 인사이트</h2>
                <div className="calendar-summary-row calendar-summary-row--duo calendar-summary-row--insights">
                  <div className="calendar-summary-card calendar-summary-card--ranking">
                    <span>상대 승률 높은 팀</span>
                    <OpponentInsightRanking
                      items={opponentInsights.teamWinRateHigh}
                      title="상대 승률 높은 팀"
                      variant="high"
                    />
                  </div>
                  <div className="calendar-summary-card calendar-summary-card--ranking">
                    <span>직관 승률 높은 팀</span>
                    <OpponentInsightRanking
                      items={opponentInsights.stadiumWinRateHigh}
                      title="직관 승률 높은 팀"
                      variant="high"
                    />
                  </div>
                </div>
              </div>
            ) : null}
            </section>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
