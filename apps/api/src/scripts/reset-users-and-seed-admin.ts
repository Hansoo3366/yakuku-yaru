import { runMigrations } from '../config/migrations.js';
import { db } from '../config/database.js';
import { hashPassword } from '../utils/password.js';

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@yakuku.local';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
const adminNickname = process.env.ADMIN_NICKNAME ?? '관리자';

await runMigrations();

await db.execute('SET FOREIGN_KEY_CHECKS = 0');
await db.execute('TRUNCATE TABLE comments');
await db.execute('TRUNCATE TABLE posts');
await db.execute('TRUNCATE TABLE notifications');
await db.execute('TRUNCATE TABLE attendance_companions');
await db.execute('TRUNCATE TABLE attendance_records');
await db.execute('TRUNCATE TABLE game_reminders');
await db.execute('TRUNCATE TABLE password_reset_tokens');
await db.execute('TRUNCATE TABLE email_verification_tokens');
await db.execute('TRUNCATE TABLE users');
await db.execute('SET FOREIGN_KEY_CHECKS = 1');

const passwordHash = await hashPassword(adminPassword);

await db.execute(
  `INSERT INTO users (
     email,
     password_hash,
     nickname,
     role,
     email_verified_at
   )
   VALUES (?, ?, ?, 'admin', CURRENT_TIMESTAMP)`,
  [adminEmail.toLowerCase(), passwordHash, adminNickname],
);

console.log('[db] 사용자·게시판·직관·알림 데이터를 비웠습니다.');
console.log('[db] 관리자 계정을 생성했습니다.');
console.log(`      이메일: ${adminEmail}`);
console.log(`      비밀번호: ${adminPassword}`);
console.log('      (운영 환경에서는 ADMIN_EMAIL / ADMIN_PASSWORD 환경 변수로 지정하세요.)');

process.exit(0);
