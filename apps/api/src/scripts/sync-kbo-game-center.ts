import { syncLog } from '../lib/sync-log.js';
import { runMigrations } from '../config/migrations.js';
import {
  syncKboGameCenter,
  type KboGameCenterSyncMode,
} from '../modules/kbo-game-center/sync-game-center.js';

const VALID_MODES = new Set<KboGameCenterSyncMode>(['today', 'week', 'month']);

function parseArgs(argv: string[]) {
  let mode: KboGameCenterSyncMode = 'today';
  const dates = new Set<string>();

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length) as KboGameCenterSyncMode;
      if (VALID_MODES.has(value)) {
        mode = value;
      }
      continue;
    }

    if (arg.startsWith('--date=')) {
      const value = arg.slice('--date='.length).replace(/-/g, '');
      if (/^\d{8}$/.test(value)) {
        dates.add(value);
      }
    }
  }

  return { mode, dates: [...dates].sort() };
}

const { mode, dates } = parseArgs(process.argv.slice(2));

await runMigrations();

syncLog(
  'kbo-game-center',
  `마이그레이션 완료, 동기화 시작 (mode=${mode}${dates.length ? ` dates=${dates.join(',')}` : ''})`,
);

const result = await syncKboGameCenter({
  mode,
  dates: dates.length ? dates : undefined,
});

console.log(
  `[kbo-game-center] 완료 — 날짜 ${result.dateCount}개, 파싱 ${result.parsed}경기, 매칭 ${result.matched}경기, 선발투수 ${result.pitcherUpserts}건, 투수스탯 ${result.pitcherStatUpserts}건, 라인업 ${result.lineupUpserts}건, 건너뜀 ${result.skipped}건`,
);

process.exit(0);
