import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

const TARGET_TABLES = {
  post: 'posts',
  comment: 'comments',
  user: 'users',
  attendance: 'attendance_records',
} as const;

export type ReportTargetType = keyof typeof TARGET_TABLES;

export async function reportTargetExists(type: ReportTargetType, id: number) {
  const [rows] = await db.query<(RowDataPacket & { found: number })[]>(
    `SELECT 1 AS found FROM ${TARGET_TABLES[type]} WHERE id = ? LIMIT 1`,
    [id],
  );

  return Boolean(rows[0]);
}

export async function upsertContentReport(input: {
  reporterUserId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  detail: string | null;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO content_reports (
       reporter_user_id,
       target_type,
       target_id,
       reason,
       detail
     )
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       reason = VALUES(reason),
       detail = VALUES(detail),
       status = 'pending',
       admin_note = NULL,
       resolved_by_user_id = NULL,
       resolved_at = NULL`,
    [
      input.reporterUserId,
      input.targetType,
      input.targetId,
      input.reason,
      input.detail,
    ],
  );

  return result.insertId;
}

export async function listAdminReports(status?: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       r.id,
       r.target_type AS targetType,
       r.target_id AS targetId,
       r.reason,
       r.detail,
       r.status,
       r.admin_note AS adminNote,
       r.created_at AS createdAt,
       reporter.nickname AS reporterNickname,
       resolver.nickname AS resolverNickname,
       CASE r.target_type
         WHEN 'post' THEN (SELECT p.title FROM posts p WHERE p.id = r.target_id)
         WHEN 'comment' THEN (SELECT LEFT(c.content, 120) FROM comments c WHERE c.id = r.target_id)
         WHEN 'user' THEN (SELECT u.nickname FROM users u WHERE u.id = r.target_id)
         WHEN 'attendance' THEN (SELECT LEFT(ar.memo, 120) FROM attendance_records ar WHERE ar.id = r.target_id)
         ELSE NULL
       END AS targetLabel
     FROM content_reports r
     JOIN users reporter ON reporter.id = r.reporter_user_id
     LEFT JOIN users resolver ON resolver.id = r.resolved_by_user_id
     WHERE (? IS NULL OR r.status = ?)
     ORDER BY (r.status = 'pending') DESC, r.created_at DESC
     LIMIT 200`,
    [status ?? null, status ?? null],
  );

  return rows;
}

export async function updateContentReport(input: {
  id: number;
  status: string;
  adminNote: string | null;
  resolverUserId: number;
}) {
  await db.execute(
    `UPDATE content_reports
     SET status = ?,
         admin_note = ?,
         resolved_by_user_id = ?,
         resolved_at = CASE WHEN ? = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
     WHERE id = ?`,
    [
      input.status,
      input.adminNote,
      input.resolverUserId,
      input.status,
      input.id,
    ],
  );
}
