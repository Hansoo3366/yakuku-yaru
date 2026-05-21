import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type UserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  nickname: string;
  favorite_team_id: number | null;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PublicUser = {
  id: number;
  email: string;
  nickname: string;
  favoriteTeamId: number | null;
  emailVerifiedAt: Date | null;
};

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    favoriteTeamId: user.favorite_team_id,
    emailVerifiedAt: user.email_verified_at,
  };
}

export async function findUserByEmail(email: string) {
  const [rows] = await db.query<UserRow[]>(
    `SELECT id, email, password_hash, nickname, favorite_team_id, email_verified_at, created_at, updated_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await db.query<UserRow[]>(
    `SELECT id, email, password_hash, nickname, favorite_team_id, email_verified_at, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  nickname: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO users (email, password_hash, nickname)
     VALUES (?, ?, ?)`,
    [input.email, input.passwordHash, input.nickname],
  );

  return findUserById(result.insertId);
}

export async function markUserEmailVerified(userId: number) {
  await db.execute(
    `UPDATE users
     SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
     WHERE id = ?`,
    [userId],
  );
}

export async function updateUserFavoriteTeam(userId: number, teamId: number) {
  await db.execute(
    `UPDATE users
     SET favorite_team_id = ?
     WHERE id = ?`,
    [teamId, userId],
  );

  return findUserById(userId);
}
