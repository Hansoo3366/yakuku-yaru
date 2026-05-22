import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type Notification = {
  id: number;
  userId: number;
  actorUserId: number | null;
  attendanceRecordId: number | null;
  type: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationRow = RowDataPacket & {
  id: number;
  user_id: number;
  actor_user_id: number | null;
  attendance_record_id: number | null;
  type: string;
  message: string;
  read_at: Date | null;
  created_at: Date;
};

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    actorUserId: row.actor_user_id,
    attendanceRecordId: row.attendance_record_id,
    type: row.type,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createNotification(input: {
  userId: number;
  actorUserId?: number | null;
  attendanceRecordId?: number | null;
  type: string;
  message: string;
}) {
  await db.execute<ResultSetHeader>(
    `INSERT INTO notifications (
      user_id,
      actor_user_id,
      attendance_record_id,
      type,
      message
    )
    VALUES (?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.actorUserId ?? null,
      input.attendanceRecordId ?? null,
      input.type,
      input.message,
    ],
  );
}

export async function listNotifications(userId: number) {
  const [rows] = await db.query<NotificationRow[]>(
    `SELECT id, user_id, actor_user_id, attendance_record_id, type, message, read_at, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 30`,
    [userId],
  );

  return rows.map(toNotification);
}

export async function countUnreadNotifications(userId: number) {
  const [rows] = await db.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE user_id = ?
       AND read_at IS NULL`,
    [userId],
  );

  return Number(rows[0]?.count ?? 0);
}

export async function markNotificationsRead(userId: number) {
  await db.execute(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = ?
       AND read_at IS NULL`,
    [userId],
  );
}

export async function markNotificationRead(input: {
  id: number;
  userId: number;
}) {
  await db.execute(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ?
       AND user_id = ?`,
    [input.id, input.userId],
  );
}

export async function deleteNotification(input: {
  id: number;
  userId: number;
}) {
  await db.execute(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
    [input.id, input.userId],
  );
}

export async function deleteAllNotifications(userId: number) {
  await db.execute(
    `DELETE FROM notifications WHERE user_id = ?`,
    [userId],
  );
}
