import { runMigrations } from '../config/migrations.js';
import { clearUserData } from './lib/clear-app-data.js';
import { seedAdminUser } from './lib/seed-admin.js';

await runMigrations();
await clearUserData();

const { adminEmail, adminPassword } = await seedAdminUser();

console.log('[db] 사용자·게시판·직관·알림 데이터를 비웠습니다.');
console.log('[db] 관리자 계정을 생성했습니다.');
console.log(`      이메일: ${adminEmail}`);
console.log(`      비밀번호: ${adminPassword}`);
console.log('      (운영 환경에서는 ADMIN_EMAIL / ADMIN_PASSWORD 환경 변수로 지정하세요.)');

process.exit(0);
