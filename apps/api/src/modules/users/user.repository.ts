import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type UserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  nickname: string;
  profile_image_url: string | null;
  role: string;
  favorite_team_id: number | null;
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PublicUser = {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  role: string;
  favoriteTeamId: number | null;
  emailVerifiedAt: Date | null;
};

export type UserSearchResult = {
  id: number;
  email: string;
  nickname: string;
  favoriteTeamId: number | null;
};

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    profileImageUrl: user.profile_image_url,
    role: user.role,
    favoriteTeamId: user.favorite_team_id,
    emailVerifiedAt: user.email_verified_at,
  };
}

const userSelectColumns =
  'id, email, password_hash, nickname, profile_image_url, role, favorite_team_id, email_verified_at, created_at, updated_at';

export async function findUserByEmail(email: string) {
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${userSelectColumns}
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await db.query<UserRow[]>(
    `SELECT ${userSelectColumns}
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function findUserByNickname(nickname: string, excludeUserId?: number) {
  const sql = excludeUserId
    ? `SELECT ${userSelectColumns}
       FROM users
       WHERE nickname = ?
         AND id <> ?
       LIMIT 1`
    : `SELECT ${userSelectColumns}
       FROM users
       WHERE nickname = ?
       LIMIT 1`;
  const params = excludeUserId ? [nickname, excludeUserId] : [nickname];
  const [rows] = await db.query<UserRow[]>(sql, params);

  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  nickname: string;
  favoriteTeamId?: number | null;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO users (email, password_hash, nickname, favorite_team_id)
     VALUES (?, ?, ?, ?)`,
    [
      input.email,
      input.passwordHash,
      input.nickname,
      input.favoriteTeamId ?? null,
    ],
  );

  return findUserById(result.insertId);
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  await db.execute(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ?`,
    [passwordHash, userId],
  );
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

export async function updateUserNickname(userId: number, nickname: string) {
  await db.execute(
    `UPDATE users
     SET nickname = ?
     WHERE id = ?`,
    [nickname, userId],
  );

  return findUserById(userId);
}

export async function updateUserProfileImage(userId: number, profileImageUrl: string) {
  await db.execute(
    `UPDATE users
     SET profile_image_url = ?
     WHERE id = ?`,
    [profileImageUrl, userId],
  );

  return findUserById(userId);
}

export async function searchUsers(input: {
  keyword: string;
  excludeUserId: number;
  limit?: number;
}) {
  const keyword = `%${input.keyword}%`;
  const [rows] = await db.query<
    (RowDataPacket & {
      id: number;
      email: string;
      nickname: string;
      favorite_team_id: number | null;
    })[]
  >(
    `SELECT id, email, nickname, favorite_team_id
     FROM users
     WHERE id <> ?
       AND (nickname LIKE ? OR email LIKE ?)
     ORDER BY nickname ASC
     LIMIT ?`,
    [input.excludeUserId, keyword, keyword, input.limit ?? 10],
  );

  return rows.map<UserSearchResult>((row) => ({
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    favoriteTeamId: row.favorite_team_id,
  }));
}
