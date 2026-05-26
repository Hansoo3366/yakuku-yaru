import { runMigrations } from '../config/migrations.js';
import { runKboSyncMode } from '../modules/kbo-schedule/sync-modes.js';
import { clearAppData } from './lib/clear-app-data.js';
import { seedAdminUser } from './lib/seed-admin.js';

const skipKboSync = process.env.SKIP_KBO_SYNC === 'true';

await runMigrations();
await clearAppData();

const { adminEmail, adminPassword } = await seedAdminUser();

console.log('[db] 경기·사용자·게시판·직관·알림 데이터를 모두 비웠습니다.');
console.log('[db] 관리자 계정을 생성했습니다.');
console.log(`      이메일: ${adminEmail}`);
console.log(`      비밀번호: ${adminPassword}`);
console.log('      (운영: ADMIN_EMAIL / ADMIN_PASSWORD 환경 변수로 지정)');

if (skipKboSync) {
  console.log('[db] SKIP_KBO_SYNC=true — KBO 동기화를 건너뜁니다.');
  process.exit(0);
}

console.log('[db] KBO 시즌 전체 동기화 시작…');
const season = await runKboSyncMode('season');
console.log(
  `[db] season 완료 — 파싱 ${season.parsed}, 추가 ${season.inserted}, 갱신 ${season.updated}`,
);

console.log('[db] KBO 주간·당일 동기화…');
await runKboSyncMode('week');
await runKboSyncMode('today');

console.log('[db] 앱 데이터 초기화 및 KBO 일정 재적재가 끝났습니다.');
process.exit(0);
