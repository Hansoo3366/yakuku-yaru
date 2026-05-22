import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import {
  listCompanionsByRecordIds,
  type AttendanceCompanion,
} from './companion.repository.js';

export type AttendanceRecordRow = RowDataPacket & {
  id: number;
  user_id: number;
  last_modified_by_user_id: number | null;
  game_id: number;
  watch_type: string;
  photo_url: string | null;
  memo: string | null;
  my_team_score: number | null;
  opponent_score: number | null;
  result: string | null;
  is_score_modified: number;
  created_at: Date;
  updated_at: Date;
  game_date: Date;
  stadium: string;
  home_team_id: number;
  home_team_name: string;
  home_team_short_name: string;
  away_team_id: number;
  away_team_name: string;
  away_team_short_name: string;
  owner_nickname: string;
  last_modified_by_nickname: string | null;
  viewer_relation?: 'owner' | 'companion';
  can_edit?: boolean;
};

export type AttendanceRecord = {
  id: number;
  userId: number;
  gameId: number;
  watchType: string;
  photoUrl: string | null;
  memo: string | null;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  isScoreModified: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerNickname: string;
  lastModifiedByUserId: number | null;
  lastModifiedByNickname: string | null;
  viewerRelation: 'owner' | 'companion';
  canEdit: boolean;
  companions: AttendanceCompanion[];
  game: {
    gameDate: Date;
    stadium: string;
    homeTeam: {
      id: number;
      name: string;
      shortName: string;
    };
    awayTeam: {
      id: number;
      name: string;
      shortName: string;
    };
  };
};

function attendanceSelectSql() {
  return `SELECT
      ar.id,
      ar.user_id,
      ar.last_modified_by_user_id,
      ar.game_id,
      ar.watch_type,
      ar.photo_url,
      ar.memo,
      ar.my_team_score,
      ar.opponent_score,
      ar.result,
      ar.is_score_modified,
      ar.created_at,
      ar.updated_at,
      g.game_date,
      g.stadium,
      ht.id AS home_team_id,
      ht.name AS home_team_name,
      ht.short_name AS home_team_short_name,
      at.id AS away_team_id,
      at.name AS away_team_name,
      at.short_name AS away_team_short_name,
      u.nickname AS owner_nickname,
      lmu.nickname AS last_modified_by_nickname
    FROM attendance_records ar
    JOIN users u ON u.id = ar.user_id
    LEFT JOIN users lmu ON lmu.id = ar.last_modified_by_user_id
    JOIN games g ON g.id = ar.game_id
    JOIN teams ht ON ht.id = g.home_team_id
    JOIN teams at ON at.id = g.away_team_id`;
}

export function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    watchType: row.watch_type,
    photoUrl: row.photo_url,
    memo: row.memo,
    myTeamScore: row.my_team_score,
    opponentScore: row.opponent_score,
    result: row.result,
    isScoreModified: Boolean(row.is_score_modified),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerNickname: row.owner_nickname,
    lastModifiedByUserId: row.last_modified_by_user_id,
    lastModifiedByNickname: row.last_modified_by_nickname,
    viewerRelation: row.viewer_relation ?? 'owner',
    canEdit: row.can_edit ?? true,
    companions: [],
    game: {
      gameDate: row.game_date,
      stadium: row.stadium,
      homeTeam: {
        id: row.home_team_id,
        name: row.home_team_name,
        shortName: row.home_team_short_name,
      },
      awayTeam: {
        id: row.away_team_id,
        name: row.away_team_name,
        shortName: row.away_team_short_name,
      },
    },
  };
}

async function attachCompanions(records: AttendanceRecord[]) {
  const companionsByRecordId = await listCompanionsByRecordIds(
    records.map((record) => record.id),
  );

  return records.map((record) => ({
    ...record,
    companions: companionsByRecordId.get(record.id) ?? [],
  }));
}

export async function createAttendanceRecord(input: {
  userId: number;
  gameId: number;
  watchType?: string;
  memo?: string | null;
  myTeamScore?: number | null;
  opponentScore?: number | null;
  result?: string | null;
  isScoreModified?: boolean;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO attendance_records (
      user_id,
      last_modified_by_user_id,
      game_id,
      watch_type,
      memo,
      my_team_score,
      opponent_score,
      result,
      is_score_modified
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.userId,
      input.gameId,
      input.watchType ?? 'stadium',
      input.memo ?? null,
      input.myTeamScore ?? null,
      input.opponentScore ?? null,
      input.result ?? null,
      input.isScoreModified ?? false,
    ],
  );

  return findAttendanceRecordById(result.insertId);
}

export async function listAttendanceRecords(input: {
  userId: number;
  from?: string;
  to?: string;
}) {
  const params: Array<number | string> = [input.userId, input.userId];
  const dateFilter =
    input.from && input.to ? 'AND g.game_date >= ? AND g.game_date < ?' : '';

  if (input.from && input.to) {
    params.push(input.from, input.to);
  }

  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql()}
     LEFT JOIN attendance_companions viewer_ac
       ON viewer_ac.attendance_record_id = ar.id
      AND viewer_ac.user_id = ?
      AND viewer_ac.status = 'accepted'
     WHERE (ar.user_id = ? OR viewer_ac.user_id IS NOT NULL)
       ${dateFilter}
     ORDER BY g.game_date ASC`,
    params,
  );

  return attachCompanions(
    rows.map((row) =>
      toAttendanceRecord({
        ...row,
        viewer_relation:
          row.user_id === input.userId ? 'owner' : 'companion',
        can_edit: true,
      }),
    ),
  );
}

export async function findAttendanceRecordById(id: number) {
  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql()}
     WHERE ar.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [record] = await attachCompanions([toAttendanceRecord(rows[0])]);
  return record;
}

export async function findAttendanceRecordByGame(input: {
  userId: number;
  gameId: number;
}) {
  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql()}
     WHERE ar.user_id = ?
       AND ar.game_id = ?
     LIMIT 1`,
    [input.userId, input.gameId],
  );

  return rows[0] ? toAttendanceRecord(rows[0]) : null;
}

export async function updateAttendanceRecord(input: {
  id: number;
  watchType?: string;
  memo?: string | null;
  myTeamScore?: number | null;
  opponentScore?: number | null;
  result?: string | null;
  isScoreModified?: boolean;
  lastModifiedByUserId?: number | null;
}) {
  await db.execute(
    `UPDATE attendance_records
     SET memo = ?,
         watch_type = ?,
         my_team_score = ?,
         opponent_score = ?,
         result = ?,
         is_score_modified = ?,
         last_modified_by_user_id = ?
     WHERE id = ?`,
    [
      input.memo ?? null,
      input.watchType ?? 'stadium',
      input.myTeamScore ?? null,
      input.opponentScore ?? null,
      input.result ?? null,
      input.isScoreModified ?? false,
      input.lastModifiedByUserId ?? null,
      input.id,
    ],
  );

  return findAttendanceRecordById(input.id);
}

export async function updateAttendancePhoto(input: {
  id: number;
  photoUrl: string;
  lastModifiedByUserId?: number | null;
}) {
  await db.execute(
    `UPDATE attendance_records
     SET photo_url = ?,
         last_modified_by_user_id = ?
     WHERE id = ?`,
    [input.photoUrl, input.lastModifiedByUserId ?? null, input.id],
  );

  return findAttendanceRecordById(input.id);
}

export async function deleteAttendanceRecord(id: number) {
  await db.execute(
    `DELETE FROM attendance_records
     WHERE id = ?`,
    [id],
  );
}

export async function getAttendanceStats(userId: number) {
  const [rows] = await db.query<
    (RowDataPacket & {
      total_count: number;
      win_count: number;
      lose_count: number;
      draw_count: number;
    })[]
  >(
    `SELECT
       COUNT(*) AS total_count,
       SUM(CASE WHEN watch_type = 'stadium' THEN 1 ELSE 0 END) AS stadium_count,
       SUM(CASE WHEN watch_type = 'home' THEN 1 ELSE 0 END) AS home_count,
       SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS win_count,
       SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) AS lose_count,
       SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) AS draw_count,
       SUM(CASE WHEN watch_type = 'stadium' AND result = 'win' THEN 1 ELSE 0 END) AS stadium_win_count,
       SUM(CASE WHEN watch_type = 'home' AND result = 'win' THEN 1 ELSE 0 END) AS home_win_count
     FROM attendance_records
     WHERE user_id = ?`,
    [userId],
  );
  const stats = rows[0] ?? {
    total_count: 0,
    win_count: 0,
    lose_count: 0,
    draw_count: 0,
  };
  const totalCount = Number(stats.total_count);
  const stadiumCount = Number(stats.stadium_count);
  const homeCount = Number(stats.home_count);
  const winCount = Number(stats.win_count);
  const loseCount = Number(stats.lose_count);
  const drawCount = Number(stats.draw_count);
  const stadiumWinCount = Number(stats.stadium_win_count);
  const homeWinCount = Number(stats.home_win_count);
  const winRate = totalCount ? Math.round((winCount / totalCount) * 1000) / 10 : 0;
  const stadiumWinRate = stadiumCount
    ? Math.round((stadiumWinCount / stadiumCount) * 1000) / 10
    : 0;
  const homeWinRate = homeCount
    ? Math.round((homeWinCount / homeCount) * 1000) / 10
    : 0;

  return {
    totalCount,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: totalCount > 0 && winRate >= 50 ? '승리요정' : null,
  };
}
