import { runMigrations } from '../config/migrations.js';
import { runKboScheduleSync } from '../jobs/kbo-schedule-sync.job.js';
import { syncKboScheduleForMonth } from '../modules/kbo-schedule/sync-schedule.js';

function parseArgs(argv: string[]) {
  let seasonYear: number | null = null;
  const months = new Set<number>();

  for (const arg of argv) {
    if (arg.startsWith('--year=')) {
      seasonYear = Number(arg.slice('--year='.length));
      continue;
    }

    if (arg.startsWith('--month=')) {
      months.add(Number(arg.slice('--month='.length)));
    }
  }

  return { seasonYear, months: [...months].sort((a, b) => a - b) };
}

const { seasonYear, months } = parseArgs(process.argv.slice(2));

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
} else {
  await runKboScheduleSync();
}

process.exit(0);
