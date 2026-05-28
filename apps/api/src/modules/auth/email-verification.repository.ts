import crypto from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export const EMAIL_VERIFICATION_EXPIRY_MINUTES = 3;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 30;
export const EMAIL_VERIFICATION_MAX_SENDS = 4;

type EmailVerificationTokenRow = RowDataPacket & {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  expires_in_seconds: number;
  resend_available_at: Date;
  resend_in_seconds: number;
};

export function generateEmailVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function invalidateActiveEmailVerificationTokens(userId: number) {
  await db.execute(
    `UPDATE email_verification_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND used_at IS NULL`,
    [userId],
  );
}

export async function createEmailVerificationToken(userId: number) {
  const token = generateEmailVerificationCode();

  await invalidateActiveEmailVerificationTokens(userId);

  await db.execute<ResultSetHeader>(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE))`,
    [userId, token, EMAIL_VERIFICATION_EXPIRY_MINUTES],
  );

  const [rows] = await db.query<EmailVerificationTokenRow[]>(
    `SELECT
       id,
       user_id,
       token,
       expires_at,
       used_at,
       created_at,
       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, expires_at)) AS expires_in_seconds,
       DATE_ADD(created_at, INTERVAL ? SECOND) AS resend_available_at,
       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, DATE_ADD(created_at, INTERVAL ? SECOND))) AS resend_in_seconds
     FROM email_verification_tokens
     WHERE user_id = ?
       AND token = ?
     ORDER BY id DESC
     LIMIT 1`,
    [
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      userId,
      token,
    ],
  );

  const row = rows[0];

  if (!row) {
    throw new Error('Failed to create email verification token');
  }

  return row;
}

type SendCountRow = RowDataPacket & { send_count: number };

export async function countEmailVerificationSends(userId: number) {
  const [rows] = await db.query<SendCountRow[]>(
    `SELECT COUNT(*) AS send_count
     FROM email_verification_tokens
     WHERE user_id = ?`,
    [userId],
  );

  return Number(rows[0]?.send_count ?? 0);
}

export async function getLatestEmailVerificationToken(userId: number) {
  const [rows] = await db.query<EmailVerificationTokenRow[]>(
    `SELECT
       id,
       user_id,
       token,
       expires_at,
       used_at,
       created_at,
       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, expires_at)) AS expires_in_seconds,
       DATE_ADD(created_at, INTERVAL ? SECOND) AS resend_available_at,
       GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, DATE_ADD(created_at, INTERVAL ? SECOND))) AS resend_in_seconds
     FROM email_verification_tokens
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
      userId,
    ],
  );

  return rows[0] ?? null;
}

export async function findUsableEmailVerificationToken(token: string) {
  const [rows] = await db.query<EmailVerificationTokenRow[]>(
    `SELECT id, user_id, token, expires_at, used_at, created_at
     FROM email_verification_tokens
     WHERE token = ?
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [token],
  );

  return rows[0] ?? null;
}

export async function findUsableEmailVerificationTokenByEmailAndCode(
  email: string,
  code: string,
) {
  const [rows] = await db.query<EmailVerificationTokenRow[]>(
    `SELECT evt.id, evt.user_id, evt.token, evt.expires_at, evt.used_at, evt.created_at
     FROM email_verification_tokens evt
     INNER JOIN users u ON u.id = evt.user_id
     WHERE u.email = ?
       AND evt.token = ?
       AND evt.used_at IS NULL
       AND evt.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [email, code],
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
