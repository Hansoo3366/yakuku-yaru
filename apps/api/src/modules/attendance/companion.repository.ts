import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type CompanionStatus = 'pending' | 'accepted' | 'rejected';

export type AttendanceCompanion = {
  id: number;
  userId: number;
  nickname: string;
  email: string;
  status: CompanionStatus;
  cheeredTeamId: number | null;
  cheeredTeamShortName: string | null;
  respondedAt: Date | null;
  createdAt: Date;
};

type CompanionRow = RowDataPacket & {
  id: number;
  attendance_record_id: number;
  user_id: number;
  nickname: string;
  email: string;
  status: string;
  cheered_team_id: number | null;
  cheered_team_short_name: string | null;
  responded_at: Date | null;
  created_at: Date;
};

function toCompanionStatus(value: string): CompanionStatus {
  if (value === 'accepted' || value === 'rejected') {
    return value;
  }

  return 'pending';
}

function uniqueUserIds(userIds: number[], ownerId: number) {
  return Array.from(
    new Set(
      userIds.filter(
        (userId) => Number.isInteger(userId) && userId > 0 && userId !== ownerId,
      ),
    ),
  );
}

export async function listCompanionsByRecordIds(recordIds: number[]) {
  if (!recordIds.length) {
    return new Map<number, AttendanceCompanion[]>();
  }

  const [rows] = await db.query<CompanionRow[]>(
    `SELECT
       ac.id,
       ac.attendance_record_id,
       ac.user_id,
       ac.status,
       ac.cheered_team_id,
       t.short_name AS cheered_team_short_name,
       ac.responded_at,
       ac.created_at,
       u.nickname,
       u.email
     FROM attendance_companions ac
     JOIN users u ON u.id = ac.user_id
     LEFT JOIN teams t ON t.id = ac.cheered_team_id
     WHERE ac.attendance_record_id IN (?)
     ORDER BY ac.created_at ASC`,
    [recordIds],
  );

  return rows.reduce<Map<number, AttendanceCompanion[]>>((acc, row) => {
    const companions = acc.get(row.attendance_record_id) ?? [];
    companions.push({
      id: row.id,
      userId: row.user_id,
      nickname: row.nickname,
      email: row.email,
      status: toCompanionStatus(row.status),
      cheeredTeamId: row.cheered_team_id,
      cheeredTeamShortName: row.cheered_team_short_name,
      respondedAt: row.responded_at,
      createdAt: row.created_at,
    });
    acc.set(row.attendance_record_id, companions);
    return acc;
  }, new Map());
}

export async function findCompanionForUser(input: {
  recordId: number;
  userId: number;
}) {
  const [rows] = await db.query<CompanionRow[]>(
    `SELECT
       ac.id,
       ac.attendance_record_id,
       ac.user_id,
       ac.status,
       ac.cheered_team_id,
       t.short_name AS cheered_team_short_name,
       ac.responded_at,
       ac.created_at,
       u.nickname,
       u.email
     FROM attendance_companions ac
     JOIN users u ON u.id = ac.user_id
     LEFT JOIN teams t ON t.id = ac.cheered_team_id
     WHERE ac.attendance_record_id = ?
       AND ac.user_id = ?
     LIMIT 1`,
    [input.recordId, input.userId],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    email: row.email,
    status: toCompanionStatus(row.status),
    cheeredTeamId: row.cheered_team_id,
    cheeredTeamShortName: row.cheered_team_short_name,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  } satisfies AttendanceCompanion;
}

export async function updateCompanionStatus(input: {
  recordId: number;
  userId: number;
  status: 'accepted' | 'rejected';
  cheeredTeamId?: number | null;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE attendance_companions
     SET status = ?,
         cheered_team_id = ?,
         responded_at = CURRENT_TIMESTAMP
     WHERE attendance_record_id = ?
       AND user_id = ?`,
    [
      input.status,
      input.status === 'accepted' ? (input.cheeredTeamId ?? null) : null,
      input.recordId,
      input.userId,
    ],
  );

  return result.affectedRows > 0;
}

export async function updateCompanionCheeredTeam(input: {
  recordId: number;
  userId: number;
  cheeredTeamId: number | null;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE attendance_companions
     SET cheered_team_id = ?
     WHERE attendance_record_id = ?
       AND user_id = ?
       AND status = 'accepted'`,
    [input.cheeredTeamId, input.recordId, input.userId],
  );

  return result.affectedRows > 0;
}

export async function replaceAttendanceCompanions(input: {
  recordId: number;
  ownerId: number;
  companionUserIds: number[];
}) {
  const nextUserIds = uniqueUserIds(input.companionUserIds, input.ownerId);
  const [existingRows] = await db.query<(RowDataPacket & { user_id: number })[]>(
    `SELECT user_id
     FROM attendance_companions
     WHERE attendance_record_id = ?`,
    [input.recordId],
  );
  const existingUserIds = existingRows.map((row) => row.user_id);
  const newUserIds = nextUserIds.filter(
    (userId) => !existingUserIds.includes(userId),
  );
  const removedUserIds = existingUserIds.filter(
    (userId) => !nextUserIds.includes(userId),
  );

  if (removedUserIds.length) {
    await db.query(
      `DELETE FROM attendance_companions
       WHERE attendance_record_id = ?
         AND user_id IN (?)`,
      [input.recordId, removedUserIds],
    );
  }

  if (newUserIds.length) {
    await db.query(
      `INSERT INTO attendance_companions (attendance_record_id, user_id, status)
       VALUES ?`,
      [newUserIds.map((userId) => [input.recordId, userId, 'pending'])],
    );
  }

  return {
    currentUserIds: nextUserIds,
    newUserIds,
    removedUserIds,
  };
}
