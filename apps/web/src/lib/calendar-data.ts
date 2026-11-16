import type { AttendanceRecord } from '@/lib/attendance-api';
import {
  countsTowardWinRate,
  isNeutralAttendance,
} from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import type { Game, TeamStandingsResponse } from '@/lib/baseball-api';
import {
  formatGameTime,
  getWeekStart,
  isGameInScheduleFilter,
} from '@/lib/calendar-range';
import type {
  CalendarScheduleFilter,
  CalendarViewMode,
  CalendarWatchTypeFilter,
} from '@/lib/calendar-ui-store';
import {
  type GameOutcome,
  getFavoriteTeamGameOutcome,
} from '@/lib/game-outcome';

/**
 * 캘린더 화면이 쓰는 파생 데이터 계산. React 없이 돌아가는 순수 함수만 둔다.
 * 날짜 키는 모두 한국 시간 기준 YYYY-MM-DD 다.
 */

// components/CalendarOutcomeLegend 의 같은 이름 타입과 모양이 같다. lib 가 components 를 가져오지 않도록 여기서 따로 적는다.
type CalendarOutcomeFilter = Exclude<GameOutcome, 'unknown'> | 'all';
type CalendarOutcomeCounts = Record<Exclude<GameOutcome, 'unknown'>, number>;
export type DateKeyRange = { from: string; to: string };
export type GamesByDate = Record<string, Game[]>;
export type AttendanceByDate = Record<string, AttendanceRecord[]>;
export type AttendanceByGameId = Record<number, AttendanceRecord[]>;

// getKoreaDateString 과 같은 결과지만, 경기마다 포매터를 새로 만들지 않도록 한 번만 만든다.
const koreaDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 경기 시각(ISO, UTC)을 한국 날짜 키로 바꾼다. `gameDate.slice(0, 10)` 은 UTC 날짜라
 * 한국 시간 오전 9시 전 경기는 전날 칸에 들어간다.
 */
export function toKoreaDateKey(gameDate: string) {
  const date = new Date(gameDate);

  if (Number.isNaN(date.getTime())) {
    return gameDate.slice(0, 10);
  }

  return koreaDateKeyFormatter.format(date);
}

export function isDateKeyInRange(dateKey: string, range: DateKeyRange) {
  return dateKey >= range.from && dateKey < range.to;
}

export function resolveDefaultScheduleFilter(
  favoriteTeamId: number | null | undefined,
): CalendarScheduleFilter {
  return favoriteTeamId ? 'favorite' : 'all';
}

export function shiftAnchor(
  date: Date,
  viewMode: CalendarViewMode,
  amount: number,
) {
  if (viewMode === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  return getWeekStart(next);
}

/** 「7승 1무 2패」 → 「7승-1무-2패」. 형식이 다르면 그대로 둔다. */
export function formatRecentTenLabel(value: string | null | undefined) {
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

/** 같은 시작 시간의 경기를 묶는다. 시간 순서는 유지한다. */
export function groupGamesByTime(games: Game[]): Array<[string, Game[]]> {
  const groups = new Map<string, Game[]>();

  for (const game of games) {
    const time = formatGameTime(game.gameDate);
    groups.set(time, [...(groups.get(time) ?? []), game]);
  }

  return [...groups.entries()];
}

export function groupAttendanceRecordsByGame(records: AttendanceRecord[]) {
  const groups = new Map<number, AttendanceRecord[]>();

  for (const record of records) {
    groups.set(record.gameId, [...(groups.get(record.gameId) ?? []), record]);
  }

  return [...groups.values()];
}

/** 일정 조회 결과에 없는 경기는 기록에 담긴 경기 정보로 채운다. */
export function gameFromAttendanceRecord(
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

export function filterGamesBySchedule(
  games: Game[],
  scheduleFilter: CalendarScheduleFilter,
  favoriteTeamId: number | null,
) {
  return games.filter((game) =>
    isGameInScheduleFilter(game, scheduleFilter, favoriteTeamId),
  );
}

export function filterAttendanceByWatchType(
  records: AttendanceRecord[],
  watchTypeFilter: CalendarWatchTypeFilter,
) {
  if (watchTypeFilter === 'all') {
    return records;
  }

  return records.filter((record) => record.watchType === watchTypeFilter);
}

/** 일정 필터에 맞는 기록과, 응원팀이 없는 중립 경기 기록을 남긴다. */
export function filterAttendanceBySchedule(
  records: AttendanceRecord[],
  scheduleFilter: CalendarScheduleFilter,
  favoriteTeamId: number | null,
) {
  return records.filter(
    (record) =>
      isGameInScheduleFilter(record.game, scheduleFilter, favoriteTeamId) ||
      isNeutralAttendance(record.game, favoriteTeamId),
  );
}

export function filterAttendanceByOutcome(
  records: AttendanceRecord[],
  outcomeFilter: CalendarOutcomeFilter,
  favoriteTeamId: number | null,
) {
  if (outcomeFilter === 'all') {
    return records;
  }

  return records.filter((record) => {
    const outcome =
      resolveAttendanceOutcome(record, favoriteTeamId) ??
      getFavoriteTeamGameOutcome(record.game, favoriteTeamId);

    return outcome === outcomeFilter;
  });
}

export function filterAttendanceInRange(
  records: AttendanceRecord[],
  range: DateKeyRange,
) {
  return records.filter((record) =>
    isDateKeyInRange(toKoreaDateKey(record.game.gameDate), range),
  );
}

/**
 * 연간 승률에 쓰는 기록. 1년치 조회 결과에 지금 화면 범위 조회 결과(같은 해만)를 덧씌워
 * 방금 고친 기록이 바로 반영되게 하고, 응원팀이 뛴 경기만 남긴다.
 */
export function mergeYearStatsRecords(
  yearRecords: AttendanceRecord[],
  rangeRecords: AttendanceRecord[],
  year: number,
  favoriteTeamId: number | null,
) {
  const byId = new Map<number, AttendanceRecord>();

  for (const record of yearRecords) {
    byId.set(record.id, record);
  }

  for (const record of rangeRecords) {
    const recordYear = Number(toKoreaDateKey(record.game.gameDate).slice(0, 4));

    if (recordYear === year) {
      byId.set(record.id, record);
    }
  }

  return [...byId.values()].filter((record) =>
    countsTowardWinRate(record.game, favoriteTeamId),
  );
}

export function findTeamStanding(
  standings: TeamStandingsResponse | null,
  teamId: number | null,
) {
  if (!teamId || !standings?.items.length) {
    return null;
  }

  return standings.items.find((item) => item.teamId === teamId) ?? null;
}

export function groupGamesByDate(games: Game[]): GamesByDate {
  return games.reduce<GamesByDate>((acc, game) => {
    const key = toKoreaDateKey(game.gameDate);
    acc[key] = [...(acc[key] ?? []), game];
    return acc;
  }, {});
}

export function groupAttendanceByDate(
  records: AttendanceRecord[],
): AttendanceByDate {
  return records.reduce<AttendanceByDate>((acc, record) => {
    const key = toKoreaDateKey(record.game.gameDate);
    acc[key] = [...(acc[key] ?? []), record];
    return acc;
  }, {});
}

export function groupAttendanceByGameId(
  records: AttendanceRecord[],
): AttendanceByGameId {
  return records.reduce<AttendanceByGameId>((acc, record) => {
    acc[record.gameId] = [...(acc[record.gameId] ?? []), record];
    return acc;
  }, {});
}

/**
 * 날짜별로 보여 줄 경기. 직관·집관 필터가 걸리면 일정 대신 그 기록의 경기만 보여 준다.
 */
export function buildBaseDisplayGamesByDate(input: {
  gamesByDate: GamesByDate;
  watchTypeFilter: CalendarWatchTypeFilter;
  scheduleScopedRecords: AttendanceRecord[];
  gamesById: Map<number, Game>;
}): GamesByDate {
  if (input.watchTypeFilter === 'all') {
    return input.gamesByDate;
  }

  const result: GamesByDate = {};

  for (const record of input.scheduleScopedRecords) {
    const key = toKoreaDateKey(record.game.gameDate);
    const game = gameFromAttendanceRecord(record, input.gamesById);
    const dayGames = result[key] ?? [];

    if (!dayGames.some((item) => item.id === game.id)) {
      result[key] = [...dayGames, game];
    }
  }

  return result;
}

/** 내 기록이 있으면 기록 기준 결과를, 없으면 응원팀 기준 경기 결과를 쓴다. */
export function resolveCalendarGameOutcome(
  game: Game,
  attendanceRecordsByGameId: AttendanceByGameId,
  favoriteTeamId: number | null,
): GameOutcome {
  const attendance = attendanceRecordsByGameId[game.id]?.[0] ?? null;

  return attendance
    ? (resolveAttendanceOutcome(attendance, favoriteTeamId) ??
        getFavoriteTeamGameOutcome(game, favoriteTeamId))
    : getFavoriteTeamGameOutcome(game, favoriteTeamId);
}

/** 기간 안 경기의 결과별 개수. 같은 경기는 한 번만 센다. */
export function countOutcomesInRange(
  gamesByDate: GamesByDate,
  range: DateKeyRange,
  resolveOutcome: (game: Game) => GameOutcome,
): CalendarOutcomeCounts {
  const counts: CalendarOutcomeCounts = {
    win: 0,
    lose: 0,
    draw: 0,
    cancelled: 0,
    scheduled: 0,
  };
  const countedGameIds = new Set<number>();

  for (const [dateKey, dayGames] of Object.entries(gamesByDate)) {
    if (!isDateKeyInRange(dateKey, range)) {
      continue;
    }

    for (const game of dayGames) {
      if (countedGameIds.has(game.id)) {
        continue;
      }

      countedGameIds.add(game.id);
      const outcome = resolveOutcome(game);

      if (outcome !== 'unknown') {
        counts[outcome] += 1;
      }
    }
  }

  return counts;
}

export function filterGamesByDateByOutcome(
  gamesByDate: GamesByDate,
  outcomeFilter: CalendarOutcomeFilter,
  resolveOutcome: (game: Game) => GameOutcome,
): GamesByDate {
  if (outcomeFilter === 'all') {
    return gamesByDate;
  }

  const result: GamesByDate = {};

  for (const [key, dayGames] of Object.entries(gamesByDate)) {
    const filteredGames = dayGames.filter(
      (game) => resolveOutcome(game) === outcomeFilter,
    );

    if (filteredGames.length > 0) {
      result[key] = filteredGames;
    }
  }

  return result;
}

export function countGamesInRange(
  gamesByDate: GamesByDate,
  range: DateKeyRange,
) {
  return Object.entries(gamesByDate).reduce(
    (total, [dateKey, dayGames]) =>
      isDateKeyInRange(dateKey, range) ? total + dayGames.length : total,
    0,
  );
}

const outcomeEmptyLabels: Record<
  Exclude<CalendarOutcomeFilter, 'all'>,
  string
> = {
  win: '승리',
  lose: '패배',
  draw: '무승부',
  cancelled: '취소된',
  scheduled: '예정된',
};

/** 경기가 하나도 없을 때 보여 줄 안내 문구 */
export function getCalendarEmptyStateCopy(input: {
  outcomeFilter: CalendarOutcomeFilter;
  watchTypeFilter: CalendarWatchTypeFilter;
  scheduleFilter: CalendarScheduleFilter;
  viewMode: CalendarViewMode;
}): { title: string; description: string } {
  const periodLabel = input.viewMode === 'month' ? '이번 달엔' : '이번 주엔';

  if (input.outcomeFilter !== 'all') {
    return {
      title: `${periodLabel} ${outcomeEmptyLabels[input.outcomeFilter]} 경기가 없어요`,
      description: '다른 경기 결과를 선택하거나 기간을 이동해보세요.',
    };
  }

  if (input.watchTypeFilter === 'all') {
    return input.scheduleFilter === 'favorite-home'
      ? {
          title: `${periodLabel} 홈구장 경기가 없어요`,
          description: '원정 경기는 「응원팀」으로 확인해보세요.',
        }
      : {
          title: `${periodLabel} 경기 일정이 없어요`,
          description: '다른 기간으로 이동해보세요.',
        };
  }

  return {
    title:
      input.watchTypeFilter === 'stadium'
        ? '이번 기간에 직관 기록이 없어요'
        : '이번 기간에 집관 기록이 없어요',
    description: '직관 기록을 남기거나 다른 기간을 확인해보세요.',
  };
}

export type CalendarSummaryItem = { label: string; value: string };

/** 머리 아래 요약 줄. 로그인 전에는 리그 전체 경기 수만 보여 준다. */
export function buildCalendarSummaryItems(input: {
  isAuthed: boolean;
  scheduleFilter: CalendarScheduleFilter;
  favoriteTeamShortName: string | null;
  hasFavoriteTeam: boolean;
  displayGameCount: number;
  periodRecordCount: number;
  standing: { rank: number; recentTen: string; streak: string } | null;
}): CalendarSummaryItem[] {
  if (!input.isAuthed) {
    return [{ label: 'KBO 리그 전체', value: `${input.displayGameCount}경기` }];
  }

  const rankLabel = input.standing
    ? `${input.standing.rank}위`
    : input.hasFavoriteTeam
      ? '—'
      : null;
  const recentTenLabel = formatRecentTenLabel(
    input.standing?.recentTen ?? null,
  );
  const streakLabel = input.standing?.streak ?? null;

  return [
    {
      // 리그 전체를 볼 때는 리그 경기 수이지 우리 팀 경기 수가 아니다.
      label:
        input.scheduleFilter === 'all'
          ? '리그 경기'
          : `${input.favoriteTeamShortName ?? '리그'} 경기`,
      value: `${input.displayGameCount}경기`,
    },
    { label: '내 기록', value: `${input.periodRecordCount}회` },
    ...(rankLabel ? [{ label: '현재 순위', value: rankLabel }] : []),
    ...(recentTenLabel
      ? [{ label: '최근 10경기', value: recentTenLabel }]
      : []),
    ...(streakLabel ? [{ label: '연속', value: streakLabel }] : []),
  ];
}
