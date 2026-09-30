import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type Notification = {
  id: number;
  userId: number;
  actorUserId: number | null;
  attendanceRecordId: number | null;
  postId: number | null;
  type: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
  /** 동행 태그 알림일 때 알림 받은 사람의 수락 상태. 알림 목록에서 기록을 따로 조회하지 않게 함께 내려준다. */
  companionStatus: 'pending' | 'accepted' | 'rejected' | null;
};

type NotificationRow = RowDataPacket & {
  id: number;
  user_id: number;
  actor_user_id: number | null;
  attendance_record_id: number | null;
  post_id: number | null;
  type: string;
  message: string;
  read_at: Date | null;
  created_at: Date;
  companion_status?: Notification['companionStatus'];
};

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    actorUserId: row.actor_user_id,
    attendanceRecordId: row.attendance_record_id,
    postId: row.post_id,
    type: row.type,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
    companionStatus: row.companion_status ?? null,
  };
}

export async function createNotification(input: {
  userId: number;
  actorUserId?: number | null;
  attendanceRecordId?: number | null;
  postId?: number | null;
  type: string;
  message: string;
}) {
  await db.execute<ResultSetHeader>(
    `INSERT INTO notifications (
      user_id,
      actor_user_id,
      attendance_record_id,
      post_id,
      type,
      message
    )
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.actorUserId ?? null,
      input.attendanceRecordId ?? null,
      input.postId ?? null,
      input.type,
      input.message,
    ],
  );
}

export async function createAdminNotifications(input: {
  actorUserId: number;
  postId?: number | null;
  type: 'feature_requested' | 'content_reported';
  message: string;
}) {
  await db.execute<ResultSetHeader>(
    `INSERT INTO notifications (
      user_id,
      actor_user_id,
      post_id,
      type,
      message
    )
    SELECT id, ?, ?, ?, ?
    FROM users
    WHERE role = 'admin'
      AND id <> ?`,
    [
      input.actorUserId,
      input.postId ?? null,
      input.type,
      input.message,
      input.actorUserId,
    ],
  );
}

export async function listNotifications(userId: number) {
  const [rows] = await db.query<NotificationRow[]>(
    `SELECT
       n.id,
       n.user_id,
       n.actor_user_id,
       n.attendance_record_id,
       n.post_id,
       n.type,
       n.message,
       n.read_at,
       n.created_at,
       ac.status AS companion_status
     FROM notifications n
     LEFT JOIN attendance_companions ac
       ON ac.attendance_record_id = n.attendance_record_id
      AND ac.user_id = n.user_id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
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
  await db.execute(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [
    input.id,
    input.userId,
  ]);
}

export async function deleteAllNotifications(userId: number) {
  await db.execute(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
}
