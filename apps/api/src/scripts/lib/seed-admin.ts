import { db } from '../../config/database.js';
import { hashPassword } from '../../utils/password.js';

export async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@yakuku.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
  const adminNickname = process.env.ADMIN_NICKNAME ?? '관리자';

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

  return { adminEmail, adminPassword, adminNickname };
}
