import { syncLog } from '../../lib/sync-log.js';
import type { ParsedKboGame } from './parse-schedule.js';
import { fetchKboMonthSchedule } from './kbo-schedule.client.js';
import { parseKboScheduleTable } from './parse-schedule.js';
import {
  listTeamIdsByShortName,
  removeKboGamesMissingFromSchedule,
  upsertKboGame,
} from './kbo-game.repository.js';
import { resolveMonthWindow, type ScheduleWindow } from './stale-games.js';
import { syncMissingBoxScores } from '../kbo-box-score/sync-box-scores.js';
import {
  fetchPostseasonSeriesByExternalId,
  KBO_REGULAR_SERIES_ID,
} from './postseason-series.js';

const KST_TIME_ZONE = 'Asia/Seoul';

export type KboSyncMode = 'season' | 'month' | 'week' | 'today';

export type MonthTarget = {
  seasonYear: number;
  month: number;
};

export type KboSyncModeSummary = {
  mode: KboSyncMode;
  targets: MonthTarget[];
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
  /** KBO 일정에서 사라져 지운 예정 경기 */
  removed: number;
  /** KBO 일정에서 사라졌지만 직관 기록이 있어 취소로 남긴 경기 */
  cancelled: number;
  /** 새로 받은 끝난 경기 박스스코어 */
  boxScores: number;
};

export function getKstYearMonth(reference = new Date()): MonthTarget {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(reference);

  return {
    seasonYear: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
  };
}

export function getKstDateString(reference = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(reference);
}

function addMonths(year: number, month: number, offset: number): MonthTarget {
  let nextMonth = month + offset;
  let nextYear = year;

  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }

  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }

  return { seasonYear: nextYear, month: nextMonth };
}

export function uniqueMonthTargets(targets: MonthTarget[]) {
  const seen = new Set<string>();
  const result: MonthTarget[] = [];

  for (const target of targets) {
    const key = `${target.seasonYear}-${target.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(target);
  }

  return result;
}

/** 시즌 전체(1~12월) */
export function getSeasonMonthTargets(seasonYear: number): MonthTarget[] {
  return Array.from({ length: 12 }, (_, index) => ({
    seasonYear,
    month: index + 1,
  }));
}

/** 이번 달만 */
export function getCurrentMonthTarget(reference = new Date()): MonthTarget[] {
  return [getKstYearMonth(reference)];
}

/** 주간 롤링: 전후 1개월 API 조회 + 날짜 필터 */
export function getWeekMonthTargets(reference = new Date()): MonthTarget[] {
  const current = getKstYearMonth(reference);
  return uniqueMonthTargets([
    addMonths(current.seasonYear, current.month, -1),
    current,
    addMonths(current.seasonYear, current.month, 1),
  ]);
}

/** 오늘 경기: 당월(+월초면 전월) API 조회 */
export function getTodayMonthTargets(reference = new Date()): MonthTarget[] {
  const current = getKstYearMonth(reference);
  const day = Number(getKstDateString(reference).slice(-2));

  if (day <= 3) {
    return uniqueMonthTargets([
      addMonths(current.seasonYear, current.month, -1),
      current,
    ]);
  }

  return [current];
}

function gameDateToKstMs(gameDate: string) {
  const normalized = gameDate.includes('T')
    ? gameDate
    : gameDate.replace(' ', 'T');
  return new Date(`${normalized}+09:00`).getTime();
}

function getKstDayBounds(reference = new Date()) {
  const ymd = getKstDateString(reference);
  return {
    fromMs: new Date(`${ymd}T00:00:00+09:00`).getTime(),
    toMs: new Date(`${ymd}T23:59:59+09:00`).getTime(),
  };
}

function getWeekBounds(reference = new Date()) {
  const nowMs = reference.getTime();
  return {
    fromMs: nowMs - 7 * 24 * 60 * 60 * 1000,
    toMs: nowMs + 14 * 24 * 60 * 60 * 1000,
  };
}

function kstSqlDateTime(ms: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function toScheduleWindow(filter: { fromMs: number; toMs: number } | null) {
  return filter
    ? { from: kstSqlDateTime(filter.fromMs), to: kstSqlDateTime(filter.toMs) }
    : null;
}

/**
 * 받은 달 일정에 없는 예정 경기를 정리한다. 응답이 비어 있으면 KBO 쪽 일시 오류일 수 있으므로 건드리지 않는다.
 */
export async function removeGamesMissingFromMonth(input: {
  target: MonthTarget;
  monthGames: ParsedKboGame[];
  filter?: ScheduleWindow | null;
}) {
  const window = resolveMonthWindow(
    input.target.seasonYear,
    input.target.month,
    input.filter,
  );

  if (!window || input.monthGames.length === 0) {
    return { deleted: 0, cancelled: 0 };
  }

  return removeKboGamesMissingFromSchedule(
    window,
    new Set(input.monthGames.map((game) => game.externalId)),
  );
}

/** 일정 반영으로 끝난 경기가 생겼을 수 있으니, 같은 범위에서 아직 없는 박스스코어를 받는다. */
export async function syncBoxScoresForMonth(input: {
  target: MonthTarget;
  filter?: ScheduleWindow | null;
}) {
  const window = resolveMonthWindow(
    input.target.seasonYear,
    input.target.month,
    input.filter,
  );

  return window ? syncMissingBoxScores(window) : { saved: 0, failed: 0 };
}

function filterGamesByRange(
  games: ParsedKboGame[],
  fromMs: number,
  toMs: number,
) {
  return games.filter((game) => {
    const ms = gameDateToKstMs(game.gameDate);
    return ms >= fromMs && ms <= toMs;
  });
}

function resolveModeTargets(mode: KboSyncMode, seasonYear: number, reference: Date) {
  switch (mode) {
    case 'season':
      return { targets: getSeasonMonthTargets(seasonYear), filter: null };
    case 'month':
      return { targets: getCurrentMonthTarget(reference), filter: null };
    case 'week':
      return {
        targets: getWeekMonthTargets(reference),
        filter: getWeekBounds(reference),
      };
    case 'today':
      return {
        targets: getTodayMonthTargets(reference),
        filter: getKstDayBounds(reference),
      };
    default:
      return { targets: getCurrentMonthTarget(reference), filter: null };
  }
}

export async function runKboSyncMode(
  mode: KboSyncMode,
  options?: { seasonYear?: number; reference?: Date },
): Promise<KboSyncModeSummary> {
  const reference = options?.reference ?? new Date();
  const seasonYear = options?.seasonYear ?? getKstYearMonth(reference).seasonYear;
  const { targets, filter } = resolveModeTargets(mode, seasonYear, reference);
  const teamIds = await listTeamIdsByShortName();

  let parsed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let removed = 0;
  let cancelled = 0;
  let boxScores = 0;
  const window = toScheduleWindow(filter);

  const targetLabel = targets
    .map((target) => `${target.seasonYear}-${String(target.month).padStart(2, '0')}`)
    .join(', ');

  syncLog('kbo-sync', `mode=${mode} months=${targetLabel}`);

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const monthLabel = `${target.seasonYear}-${String(target.month).padStart(2, '0')}`;

    syncLog(
      'kbo-sync',
      `${index + 1}/${targets.length} ${monthLabel} 일정 조회 중…`,
    );

    const table = await fetchKboMonthSchedule({
      seasonYear: target.seasonYear,
      month: target.month,
    });
    const monthGames = parseKboScheduleTable(table, target.seasonYear);
    const seriesByExternalId = await fetchPostseasonSeriesByExternalId(
      target.seasonYear,
      target.month,
    );
    const parsedGames = filter
      ? filterGamesByRange(monthGames, filter.fromMs, filter.toMs)
      : monthGames;

    parsed += parsedGames.length;

    syncLog(
      'kbo-sync',
      `${monthLabel} — ${parsedGames.length}경기 DB 반영 중…`,
    );

    for (const game of parsedGames) {
      const result = await upsertKboGame(
        game,
        teamIds,
        seriesByExternalId.get(game.externalId) ?? KBO_REGULAR_SERIES_ID,
      );

      if (result === 'inserted') inserted += 1;
      else if (result === 'updated') updated += 1;
      else skipped += 1;
    }

    const stale = await removeGamesMissingFromMonth({
      target,
      monthGames,
      filter: window,
    });
    removed += stale.deleted;
    cancelled += stale.cancelled;

    const boxScoreResult = await syncBoxScoresForMonth({ target, filter: window });
    boxScores += boxScoreResult.saved;
  }

  console.log(
    `[kbo-sync] 완료 — 파싱 ${parsed}건, 추가 ${inserted}, 갱신 ${updated}, 건너뜀 ${skipped}, 일정에서 빠져 삭제 ${removed}, 취소 처리 ${cancelled}, 박스스코어 ${boxScores}`,
  );

  return {
    mode,
    targets,
    parsed,
    inserted,
    updated,
    skipped,
    removed,
    cancelled,
    boxScores,
  };
}
