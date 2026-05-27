import { syncLog } from '../../lib/sync-log.js';
import type { ParsedKboGame } from './parse-schedule.js';
import { fetchKboMonthSchedule } from './kbo-schedule.client.js';
import { parseKboScheduleTable } from './parse-schedule.js';
import { listTeamIdsByShortName, upsertKboGame } from './kbo-game.repository.js';

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
    let parsedGames = parseKboScheduleTable(table, target.seasonYear);

    if (filter) {
      parsedGames = filterGamesByRange(parsedGames, filter.fromMs, filter.toMs);
    }

    parsed += parsedGames.length;

    syncLog(
      'kbo-sync',
      `${monthLabel} — ${parsedGames.length}경기 DB 반영 중…`,
    );

    for (const game of parsedGames) {
      const result = await upsertKboGame(game, teamIds);

      if (result === 'inserted') inserted += 1;
      else if (result === 'updated') updated += 1;
      else skipped += 1;
    }
  }

  console.log(
    `[kbo-sync] 완료 — 파싱 ${parsed}건, 추가 ${inserted}, 갱신 ${updated}, 건너뜀 ${skipped}`,
  );

  return {
    mode,
    targets,
    parsed,
    inserted,
    updated,
    skipped,
  };
}
