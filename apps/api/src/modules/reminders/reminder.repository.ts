import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type GameReminderRow = RowDataPacket & {
  id: number;
  user_id: number;
  game_id: number;
  reminder_type: string;
  created_at: Date;
};

export async function findGameReminder(input: {
  userId: number;
  gameId: number;
  reminderType?: string;
}) {
  const [rows] = await db.query<GameReminderRow[]>(
    `SELECT id, user_id, game_id, reminder_type, created_at
     FROM game_reminders
     WHERE user_id = ?
       AND game_id = ?
       AND reminder_type = ?
     LIMIT 1`,
    [input.userId, input.gameId, input.reminderType ?? 'game_day'],
  );

  return rows[0] ?? null;
}

export async function createGameReminder(input: {
  userId: number;
  gameId: number;
  reminderType?: string;
}) {
  await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO game_reminders (user_id, game_id, reminder_type)
     VALUES (?, ?, ?)`,
    [input.userId, input.gameId, input.reminderType ?? 'game_day'],
  );

  return findGameReminder(input);
}

export async function deleteGameReminder(input: {
  userId: number;
  gameId: number;
  reminderType?: string;
}) {
  await db.execute(
    `DELETE FROM game_reminders
     WHERE user_id = ?
       AND game_id = ?
       AND reminder_type = ?`,
    [input.userId, input.gameId, input.reminderType ?? 'game_day'],
  );
}
