import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { validateStadiumNoteField } from '../../utils/user-input.js';

const MAX_STADIUM_LENGTH = 100;

export type UserStadiumNoteRow = RowDataPacket & {
  id: number;
  user_id: number;
  stadium: string;
  food_memo: string;
  parking_memo: string;
  created_at: Date;
  updated_at: Date;
};

export type UserStadiumNote = {
  stadium: string;
  foodMemo: string;
  parkingMemo: string;
  updatedAt: string;
};

export function normalizeStadiumName(stadium: string) {
  const trimmed = stadium.trim();

  if (!trimmed || trimmed.length > MAX_STADIUM_LENGTH) {
    return null;
  }

  return trimmed;
}

export function normalizeStadiumNoteFields(input: {
  foodMemo?: string;
  parkingMemo?: string;
}) {
  const foodMemo =
    typeof input.foodMemo === 'string'
      ? validateStadiumNoteField(input.foodMemo)
      : '';
  const parkingMemo =
    typeof input.parkingMemo === 'string'
      ? validateStadiumNoteField(input.parkingMemo)
      : '';

  return { foodMemo, parkingMemo };
}

function toUserStadiumNote(row: UserStadiumNoteRow): UserStadiumNote {
  return {
    stadium: row.stadium,
    foodMemo: row.food_memo,
    parkingMemo: row.parking_memo,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findUserStadiumNote(input: {
  userId: number;
  stadium: string;
}) {
  const [rows] = await db.query<UserStadiumNoteRow[]>(
    `SELECT id, user_id, stadium, food_memo, parking_memo, created_at, updated_at
     FROM user_stadium_notes
     WHERE user_id = ?
       AND stadium = ?
     LIMIT 1`,
    [input.userId, input.stadium],
  );

  return rows[0] ? toUserStadiumNote(rows[0]) : null;
}

export async function upsertUserStadiumNote(input: {
  userId: number;
  stadium: string;
  foodMemo: string;
  parkingMemo: string;
}) {
  await db.execute<ResultSetHeader>(
    `INSERT INTO user_stadium_notes (user_id, stadium, food_memo, parking_memo)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       food_memo = VALUES(food_memo),
       parking_memo = VALUES(parking_memo),
       updated_at = CURRENT_TIMESTAMP`,
    [input.userId, input.stadium, input.foodMemo, input.parkingMemo],
  );

  return findUserStadiumNote({
    userId: input.userId,
    stadium: input.stadium,
  });
}

export async function deleteUserStadiumNote(input: {
  userId: number;
  stadium: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM user_stadium_notes
     WHERE user_id = ?
       AND stadium = ?`,
    [input.userId, input.stadium],
  );

  return result.affectedRows > 0;
}
