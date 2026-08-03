import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { hashPassword } from '../../utils/password.js';

export function getAdminSeedConfig() {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = configuredEmail || 'admin@yakuku.local';
  const adminPassword = configuredPassword || 'Admin1234!';
  const adminNickname = process.env.ADMIN_NICKNAME ?? '관리자';

  if (
    env.nodeEnv === 'production' &&
    (!configuredEmail || !configuredPassword)
  ) {
    throw new Error(
      'Production admin seed requires explicit ADMIN_EMAIL and ADMIN_PASSWORD.',
    );
  }

  if (env.nodeEnv === 'production' && adminPassword.length < 12) {
    throw new Error(
      'Production ADMIN_PASSWORD must be at least 12 characters.',
    );
  }

  return { adminEmail, adminPassword, adminNickname };
}

export async function seedAdminUser(config = getAdminSeedConfig()) {
  const { adminEmail, adminPassword, adminNickname } = config;

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

  return { adminEmail, adminNickname };
}
