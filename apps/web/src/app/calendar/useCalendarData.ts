'use client';

import { useCallback, useMemo } from 'react';
import type { Game } from '@/lib/baseball-api';
import type { CalendarOutcomeFilter } from '@/components/CalendarOutcomeLegend';
import {
  buildBaseDisplayGamesByDate,
  countGamesInRange,
  countOutcomesInRange,
  filterAttendanceByOutcome,
  filterAttendanceBySchedule,
  filterAttendanceByWatchType,
  filterAttendanceInRange,
  filterGamesByDateByOutcome,
  filterGamesBySchedule,
  findTeamStanding,
  groupAttendanceByDate,
  groupAttendanceByGameId,
  groupGamesByDate,
  mergeYearStatsRecords,
  resolveCalendarGameOutcome,
} from '@/lib/calendar-data';
import { getStadiumAttendanceOpponentInsights } from '@/lib/calendar-opponent-insights';
import {
  getCalendarGridRange,
  getCalendarMonthDays,
  getMonthRange,
  getMonthStart,
  getWeekDays,
  getWeekRange,
  getWeekStart,
  getYearRange,
} from '@/lib/calendar-range';
import type {
  CalendarScheduleFilter,
  CalendarViewMode,
  CalendarWatchTypeFilter,
} from '@/lib/calendar-ui-store';
import {
  getHomeAttendanceWinRate,
  getStadiumAttendanceWinRate,
} from '@/lib/calendar-win-rates';
import {
  getKboFavoriteTeamSeasonWinRate,
  getKboOpponentWinRateInsights,
} from '@/lib/kbo-season-insights';
import {
  useAttendanceRecordsQuery,
  useGamesQuery,
  useTeamsQuery,
  useTeamStandingsQuery,
} from '@/lib/queries';

type UseCalendarDataInput = {
  viewMode: CalendarViewMode;
  anchorDate: Date;
  token: string | null;
  isAuthed: boolean;
  /** 로그인 정보를 아직 받는 중인지. 로딩 표시에 함께 쓴다. */
  isSessionLoading: boolean;
  /** 아래 필터와 팀은 로그인 여부를 이미 반영한 값이다. */
  scheduleFilter: CalendarScheduleFilter;
  watchTypeFilter: CalendarWatchTypeFilter;
  outcomeFilter: CalendarOutcomeFilter;
  favoriteTeamId: number | null;
};

/** 캘린더 화면의 조회와 파생 데이터(필터, 날짜별 묶음, 결과 개수, 승률)를 한곳에서 계산한다. */
export function useCalendarData({
  viewMode,
  anchorDate,
  token,
  isAuthed,
  isSessionLoading,
  scheduleFilter,
  watchTypeFilter,
  outcomeFilter,
  favoriteTeamId,
}: UseCalendarDataInput) {
  const monthStart = useMemo(() => getMonthStart(anchorDate), [anchorDate]);
  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);
  const range = useMemo(
    () =>
      viewMode === 'month'
        ? getCalendarGridRange(monthStart)
        : getWeekRange(weekStart),
    [viewMode, monthStart, weekStart],
  );
  // 조회(range)는 격자 전체지만, 요약 수치와 결과 개수는 그 달(주)만 센다.
  const periodRange = useMemo(
    () =>
      viewMode === 'month'
        ? getMonthRange(monthStart)
        : getWeekRange(weekStart),
    [viewMode, monthStart, weekStart],
  );
  const statsYear = anchorDate.getFullYear();
  const yearRange = useMemo(() => getYearRange(statsYear), [statsYear]);

  const activeTeamId =
    scheduleFilter !== 'all' ? (favoriteTeamId ?? undefined) : undefined;
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
    { ...yearRange, teamId: favoriteTeamId ?? undefined },
    { enabled: Boolean(isAuthed && favoriteTeamId) },
  );

  const teams = teamsQuery.data?.items ?? [];
  const rawGames = useMemo(
    () => gamesQuery.data?.items ?? [],
    [gamesQuery.data?.items],
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
    isSessionLoading ||
    teamsQuery.isLoading ||
    gamesQuery.isLoading ||
    (isAuthed && attendanceRecordsQuery.isLoading);

  const games = useMemo(
    () => filterGamesBySchedule(rawGames, scheduleFilter, favoriteTeamId),
    [rawGames, scheduleFilter, favoriteTeamId],
  );

  // 기록 필터는 직관·집관 → 일정 → 경기 결과 순서로 좁힌다.
  const scheduleScopedAttendanceRecords = useMemo(
    () =>
      filterAttendanceBySchedule(
        filterAttendanceByWatchType(attendanceRecords, watchTypeFilter),
        scheduleFilter,
        favoriteTeamId,
      ),
    [attendanceRecords, watchTypeFilter, scheduleFilter, favoriteTeamId],
  );
  const outcomeScopedAttendanceRecords = useMemo(
    () =>
      filterAttendanceByOutcome(
        scheduleScopedAttendanceRecords,
        outcomeFilter,
        favoriteTeamId,
      ),
    [scheduleScopedAttendanceRecords, outcomeFilter, favoriteTeamId],
  );
  const periodRecordCount = useMemo(
    () =>
      filterAttendanceInRange(outcomeScopedAttendanceRecords, periodRange)
        .length,
    [outcomeScopedAttendanceRecords, periodRange],
  );

  const statsAttendanceRecords = useMemo(
    () =>
      mergeYearStatsRecords(
        yearAttendanceRecords,
        attendanceRecords,
        statsYear,
        favoriteTeamId,
      ),
    [yearAttendanceRecords, attendanceRecords, statsYear, favoriteTeamId],
  );
  const stats = useMemo(() => {
    const kbo = getKboOpponentWinRateInsights(yearSeasonGames, favoriteTeamId);
    const stadium = getStadiumAttendanceOpponentInsights(
      statsAttendanceRecords,
      favoriteTeamId,
    );

    return {
      stadiumWinRate: getStadiumAttendanceWinRate(
        statsAttendanceRecords,
        favoriteTeamId,
      ),
      homeWinRate: getHomeAttendanceWinRate(
        statsAttendanceRecords,
        favoriteTeamId,
      ),
      teamWinRate: getKboFavoriteTeamSeasonWinRate(
        teamStandings,
        favoriteTeamId,
      ),
      teamWinRateHigh: kbo.high,
      stadiumWinRateHigh: stadium.high,
    };
  }, [yearSeasonGames, statsAttendanceRecords, teamStandings, favoriteTeamId]);
  const favoriteTeamStanding = useMemo(
    () => findTeamStanding(teamStandings, favoriteTeamId),
    [teamStandings, favoriteTeamId],
  );

  const gamesByDate = useMemo(() => groupGamesByDate(games), [games]);
  const gamesById = useMemo(
    () => new Map(games.map((game) => [game.id, game])),
    [games],
  );
  const attendanceRecordsByGameId = useMemo(
    () => groupAttendanceByGameId(scheduleScopedAttendanceRecords),
    [scheduleScopedAttendanceRecords],
  );
  const baseDisplayGamesByDate = useMemo(
    () =>
      buildBaseDisplayGamesByDate({
        gamesByDate,
        watchTypeFilter,
        scheduleScopedRecords: scheduleScopedAttendanceRecords,
        gamesById,
      }),
    [gamesByDate, watchTypeFilter, scheduleScopedAttendanceRecords, gamesById],
  );
  const resolveGameOutcome = useCallback(
    (game: Game) =>
      resolveCalendarGameOutcome(
        game,
        attendanceRecordsByGameId,
        favoriteTeamId,
      ),
    [attendanceRecordsByGameId, favoriteTeamId],
  );
  const outcomeCounts = useMemo(
    () =>
      countOutcomesInRange(
        baseDisplayGamesByDate,
        periodRange,
        resolveGameOutcome,
      ),
    [baseDisplayGamesByDate, periodRange, resolveGameOutcome],
  );
  const displayGamesByDate = useMemo(
    () =>
      filterGamesByDateByOutcome(
        baseDisplayGamesByDate,
        outcomeFilter,
        resolveGameOutcome,
      ),
    [baseDisplayGamesByDate, outcomeFilter, resolveGameOutcome],
  );
  const displayGameCount = useMemo(
    () => countGamesInRange(displayGamesByDate, periodRange),
    [displayGamesByDate, periodRange],
  );
  const attendanceByDate = useMemo(
    () => groupAttendanceByDate(outcomeScopedAttendanceRecords),
    [outcomeScopedAttendanceRecords],
  );

  const days =
    viewMode === 'month'
      ? getCalendarMonthDays(monthStart)
      : getWeekDays(weekStart);
  const favoriteTeam = teams.find((team) => team.id === favoriteTeamId);

  return {
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
  };
}
