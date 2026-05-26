import { runMigrations } from '../config/migrations.js';
import {
  runKboSyncMode,
  type KboSyncMode,
} from '../modules/kbo-schedule/sync-modes.js';
import { syncKboScheduleForMonth } from '../modules/kbo-schedule/sync-schedule.js';

const VALID_MODES = new Set<KboSyncMode>(['season', 'month', 'week', 'today']);

function parseArgs(argv: string[]) {
  let mode: KboSyncMode | null = null;
  let seasonYear: number | null = null;
  const months = new Set<number>();

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length) as KboSyncMode;
      if (VALID_MODES.has(value)) {
        mode = value;
      }
      continue;
    }

    if (arg.startsWith('--year=')) {
      seasonYear = Number(arg.slice('--year='.length));
      continue;
    }

    if (arg.startsWith('--month=')) {
      months.add(Number(arg.slice('--month='.length)));
    }
  }

  return { mode, seasonYear, months: [...months].sort((a, b) => a - b) };
}

const { mode, seasonYear, months } = parseArgs(process.argv.slice(2));

await runMigrations();

if (seasonYear && months.length > 0) {
  let parsed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const month of months) {
    const summary = await syncKboScheduleForMonth(seasonYear, month);
    parsed += summary.parsed;
    inserted += summary.inserted;
    updated += summary.updated;
    skipped += summary.skipped;
  }

  console.log(
    `[kbo-sync] 완료 — 파싱 ${parsed}건, 추가 ${inserted}, 갱신 ${updated}, 건너뜀 ${skipped}`,
  );
} else if (mode) {
  await runKboSyncMode(mode, {
    seasonYear: seasonYear ?? undefined,
  });
} else {
  await runKboSyncMode('week');
}

process.exit(0);
