import crypto from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { durationToMs } from '../../utils/duration.js';

type RefreshSessionRow = RowDataPacket & {
  id: number;
  user_id: number;
  family_id: string;
  session_version: number;
  expires_at: Date;
  remember_me: number | boolean;
  rotated_at: Date | null;
  revoked_at: Date | null;
};

export type IssuedRefreshSession = {
  token: string;
  expiresAt: Date;
  rememberMe: boolean;
};

export type RotatedRefreshSession = IssuedRefreshSession & {
  userId: number;
  sessionVersion: number;
};

function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRefreshSession(input: {
  userId: number;
  sessionVersion: number;
  rememberMe: boolean;
}): Promise<IssuedRefreshSession> {
  const token = createOpaqueToken();
  const tokenHash = hashRefreshToken(token);
  const familyId = crypto.randomUUID();
  const lifetime = input.rememberMe
    ? env.jwt.refreshRememberExpiresIn
    : env.jwt.refreshExpiresIn;
  const expiresAt = new Date(Date.now() + durationToMs(lifetime));

  await db.execute<ResultSetHeader>(
    `INSERT INTO refresh_sessions (
       user_id,
       family_id,
       token_hash,
       session_version,
       remember_me,
       expires_at
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      familyId,
      tokenHash,
      input.sessionVersion,
      input.rememberMe,
      expiresAt,
    ],
  );

  return { token, expiresAt, rememberMe: input.rememberMe };
}

export async function rotateRefreshSession(
  token: string,
): Promise<RotatedRefreshSession | null> {
  const tokenHash = hashRefreshToken(token);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<RefreshSessionRow[]>(
      `SELECT
         rs.id,
         rs.user_id,
         rs.family_id,
         rs.session_version,
         rs.expires_at,
         rs.remember_me,
         rs.rotated_at,
         rs.revoked_at
       FROM refresh_sessions rs
       WHERE rs.token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );
    const session = rows[0];

    if (!session) {
      await connection.rollback();
      return null;
    }

    if (session.rotated_at || session.revoked_at) {
      await connection.execute(
        `UPDATE refresh_sessions
         SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
         WHERE family_id = ?`,
        [session.family_id],
      );
      await connection.commit();
      return null;
    }

    const [userRows] = await connection.query<
      (RowDataPacket & { session_version: number })[]
    >(
      `SELECT session_version
       FROM users
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [session.user_id],
    );
    const currentSessionVersion = userRows[0]?.session_version;
    const expired = session.expires_at.getTime() <= Date.now();
    const versionChanged =
      currentSessionVersion === undefined ||
      Number(currentSessionVersion) !== Number(session.session_version);

    if (expired || versionChanged) {
      await connection.execute(
        `UPDATE refresh_sessions
         SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
         WHERE family_id = ?`,
        [session.family_id],
      );
      await connection.commit();
      return null;
    }

    const nextToken = createOpaqueToken();
    const nextTokenHash = hashRefreshToken(nextToken);
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO refresh_sessions (
         user_id,
         family_id,
         token_hash,
         session_version,
         remember_me,
         expires_at
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        session.user_id,
        session.family_id,
        nextTokenHash,
        session.session_version,
        Boolean(session.remember_me),
        session.expires_at,
      ],
    );

    await connection.execute(
      `UPDATE refresh_sessions
       SET rotated_at = CURRENT_TIMESTAMP,
           replaced_by_session_id = ?
       WHERE id = ?`,
      [insertResult.insertId, session.id],
    );

    await connection.commit();

    return {
      token: nextToken,
      userId: Number(session.user_id),
      sessionVersion: Number(session.session_version),
      expiresAt: session.expires_at,
      rememberMe: Boolean(session.remember_me),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function revokeRefreshSession(token: string) {
  const tokenHash = hashRefreshToken(token);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<
      (RowDataPacket & { family_id: string })[]
    >(
      `SELECT family_id
       FROM refresh_sessions
       WHERE token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );
    const familyId = rows[0]?.family_id;

    if (familyId) {
      await connection.execute(
        `UPDATE refresh_sessions
         SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
         WHERE family_id = ?`,
        [familyId],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function revokeAllRefreshSessionsForUser(userId: number) {
  await db.execute(
    `UPDATE refresh_sessions
     SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
     WHERE user_id = ?`,
    [userId],
  );
}
