import crypto from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

type EmailVerificationTokenRow = RowDataPacket & {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
};

export async function createEmailVerificationToken(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');

  await db.execute<ResultSetHeader>(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR))`,
    [userId, token],
  );

  return token;
}

export async function findUsableEmailVerificationToken(token: string) {
  const [rows] = await db.query<EmailVerificationTokenRow[]>(
    `SELECT id, user_id, token, expires_at, used_at
     FROM email_verification_tokens
     WHERE token = ?
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [token],
  );

  return rows[0] ?? null;
}

export async function markEmailVerificationTokenUsed(tokenId: number) {
  await db.execute(
    `UPDATE email_verification_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [tokenId],
  );
}
