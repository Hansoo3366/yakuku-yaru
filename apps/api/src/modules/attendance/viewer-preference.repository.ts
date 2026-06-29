import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type AttendanceViewerPreference = {
  userId: number;
  gameId: number;
  cheeredTeamId: number | null;
  cheeredTeamShortName: string | null;
};

type AttendanceViewerPreferenceRow = RowDataPacket & {
  user_id: number;
  game_id: number;
  cheered_team_id: number | null;
  cheered_team_short_name: string | null;
};

export async function getAttendanceViewerPreference(input: {
  userId: number;
  gameId: number;
}) {
  const [rows] = await db.query<AttendanceViewerPreferenceRow[]>(
    `SELECT
       avp.user_id,
       avp.game_id,
       avp.cheered_team_id,
       t.short_name AS cheered_team_short_name
     FROM attendance_viewer_preferences avp
     LEFT JOIN teams t ON t.id = avp.cheered_team_id
     WHERE avp.user_id = ?
       AND avp.game_id = ?
     LIMIT 1`,
    [input.userId, input.gameId],
  );
  const row = rows[0];

  return row
    ? ({
        userId: row.user_id,
        gameId: row.game_id,
        cheeredTeamId: row.cheered_team_id,
        cheeredTeamShortName: row.cheered_team_short_name,
      } satisfies AttendanceViewerPreference)
    : null;
}

export async function listAttendanceViewerPreferences(input: {
  userId: number;
  gameIds: number[];
}) {
  if (!input.gameIds.length) {
    return new Map<number, AttendanceViewerPreference>();
  }

  const [rows] = await db.query<AttendanceViewerPreferenceRow[]>(
    `SELECT
       avp.user_id,
       avp.game_id,
       avp.cheered_team_id,
       t.short_name AS cheered_team_short_name
     FROM attendance_viewer_preferences avp
     LEFT JOIN teams t ON t.id = avp.cheered_team_id
     WHERE avp.user_id = ?
       AND avp.game_id IN (?)`,
    [input.userId, input.gameIds],
  );

  return rows.reduce<Map<number, AttendanceViewerPreference>>((acc, row) => {
    acc.set(row.game_id, {
      userId: row.user_id,
      gameId: row.game_id,
      cheeredTeamId: row.cheered_team_id,
      cheeredTeamShortName: row.cheered_team_short_name,
    });
    return acc;
  }, new Map());
}

export async function upsertAttendanceViewerPreference(input: {
  userId: number;
  gameId: number;
  cheeredTeamId: number;
}) {
  await db.execute(
    `INSERT INTO attendance_viewer_preferences (
       user_id,
       game_id,
       cheered_team_id
     )
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       cheered_team_id = VALUES(cheered_team_id)`,
    [input.userId, input.gameId, input.cheeredTeamId],
  );

  return getAttendanceViewerPreference({
    userId: input.userId,
    gameId: input.gameId,
  });
}
