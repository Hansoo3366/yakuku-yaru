import { runMigrations } from '../config/migrations.js';
import { clearUserData } from './lib/clear-app-data.js';
import { getAdminSeedConfig, seedAdminUser } from './lib/seed-admin.js';

const adminSeedConfig = getAdminSeedConfig();

await runMigrations();
await clearUserData();

const { adminEmail } = await seedAdminUser(adminSeedConfig);

console.log('[db] 사용자·게시판·직관·알림 데이터를 비웠습니다.');
console.log('[db] 관리자 계정을 생성했습니다.');
console.log(`      이메일: ${adminEmail}`);
console.log('      비밀번호는 로그에 표시하지 않습니다.');

process.exit(0);
