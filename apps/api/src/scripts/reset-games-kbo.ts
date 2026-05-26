import { runMigrations } from '../config/migrations.js';
import { runKboSyncMode } from '../modules/kbo-schedule/sync-modes.js';
import { clearGamesData } from './lib/clear-games.js';

await runMigrations();
await clearGamesData();

console.log('[db] 경기·직관 기록·경기 알림을 비웠습니다. (사용자·게시판 유지)');

console.log('[db] KBO 시즌 전체 동기화…');
const season = await runKboSyncMode('season');
console.log(
  `[db] season — 파싱 ${season.parsed}, 추가 ${season.inserted}, 갱신 ${season.updated}, 건너뜀 ${season.skipped}`,
);

await runKboSyncMode('week');
await runKboSyncMode('today');

console.log('[db] KBO 경기 일정 재적재 완료.');
process.exit(0);
