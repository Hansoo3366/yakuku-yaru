import crypto from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

type PasswordResetTokenRow = RowDataPacket & {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
};

export async function invalidatePasswordResetTokensForUser(userId: number) {
  await db.execute(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND used_at IS NULL`,
    [userId],
  );
}

export async function createPasswordResetToken(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');

  await invalidatePasswordResetTokensForUser(userId);

  await db.execute<ResultSetHeader>(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 HOUR))`,
    [userId, token],
  );

  return token;
}

export async function findUsablePasswordResetToken(token: string) {
  const [rows] = await db.query<PasswordResetTokenRow[]>(
    `SELECT id, user_id, token, expires_at, used_at
     FROM password_reset_tokens
     WHERE token = ?
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [token],
  );

  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(tokenId: number) {
  await db.execute(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [tokenId],
  );
}
