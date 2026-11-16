import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import {
  findUserById,
  getFavoriteTeamIdFromUser,
} from '../users/user.repository.js';
import type { AttendanceResult } from './attendance-score.js';
import {
  computeAttendanceStats,
  getKoreaYearRange,
} from './attendance-stats.js';
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
  cheered_team_id: number | null;
  cheered_team_short_name: string | null;
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
  home_score: number | null;
  away_team_id: number;
  away_team_name: string;
  away_team_short_name: string;
  away_score: number | null;
  game_status: string;
  cancellation_reason: string | null;
  owner_nickname: string;
  owner_favorite_team_id: number | null;
  last_modified_by_nickname: string | null;
  viewer_cheered_team_id?: number | null;
  viewer_cheered_team_short_name?: string | null;
  viewer_relation?: 'owner' | 'companion';
  can_edit?: boolean;
};

export type AttendanceRecord = {
  id: number;
  userId: number;
  gameId: number;
  watchType: string;
  cheeredTeamId: number | null;
  cheeredTeamShortName: string | null;
  photoUrl: string | null;
  memo: string | null;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  isScoreModified: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerNickname: string;
  ownerFavoriteTeamId: number | null;
  viewerCheeredTeamId: number | null;
  viewerCheeredTeamShortName: string | null;
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
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    cancellationReason: string | null;
  };
};

export function attendanceSelectSql(extraSelect = '') {
  return `SELECT
      ar.id,
      ar.user_id,
      ar.last_modified_by_user_id,
      ar.game_id,
      ar.watch_type,
      ar.cheered_team_id,
      ct.short_name AS cheered_team_short_name,
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
      g.home_score,
      at.id AS away_team_id,
      at.name AS away_team_name,
      at.short_name AS away_team_short_name,
      g.away_score,
      g.status AS game_status,
      g.cancellation_reason,
      u.nickname AS owner_nickname,
      u.favorite_team_id AS owner_favorite_team_id,
      lmu.nickname AS last_modified_by_nickname
      ${extraSelect}
    FROM attendance_records ar
    JOIN users u ON u.id = ar.user_id
    LEFT JOIN users lmu ON lmu.id = ar.last_modified_by_user_id
    JOIN games g ON g.id = ar.game_id
    JOIN teams ht ON ht.id = g.home_team_id
    JOIN teams at ON at.id = g.away_team_id
    LEFT JOIN teams ct ON ct.id = ar.cheered_team_id`;
}

export function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    watchType: row.watch_type,
    cheeredTeamId: row.cheered_team_id,
    cheeredTeamShortName: row.cheered_team_short_name,
    photoUrl: row.photo_url,
    memo: row.memo,
    myTeamScore: row.my_team_score,
    opponentScore: row.opponent_score,
    result: row.result,
    isScoreModified: Boolean(row.is_score_modified),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerNickname: row.owner_nickname,
    ownerFavoriteTeamId: row.owner_favorite_team_id,
    viewerCheeredTeamId: row.viewer_cheered_team_id ?? null,
    viewerCheeredTeamShortName: row.viewer_cheered_team_short_name ?? null,
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
      homeScore: row.home_score,
      awayScore: row.away_score,
      status: row.game_status,
      cancellationReason: row.cancellation_reason,
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
  cheeredTeamId?: number | null;
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
      cheered_team_id,
      memo,
      my_team_score,
      opponent_score,
      result,
      is_score_modified
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.userId,
      input.gameId,
      input.watchType ?? 'stadium',
      input.cheeredTeamId ?? null,
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
    `${attendanceSelectSql(
      `,
      avp.cheered_team_id AS viewer_cheered_team_id,
      viewer_ct.short_name AS viewer_cheered_team_short_name`,
    )}
     LEFT JOIN attendance_companions viewer_ac
       ON viewer_ac.attendance_record_id = ar.id
      AND viewer_ac.user_id = ?
      AND viewer_ac.status = 'accepted'
     LEFT JOIN attendance_viewer_preferences avp
       ON avp.user_id = ?
      AND avp.game_id = ar.game_id
     LEFT JOIN teams viewer_ct ON viewer_ct.id = avp.cheered_team_id
     WHERE (ar.user_id = ? OR viewer_ac.user_id IS NOT NULL)
       ${dateFilter}
     ORDER BY g.game_date ASC`,
    [input.userId, ...params],
  );

  return attachCompanions(
    rows.map((row) =>
      toAttendanceRecord({
        ...row,
        viewer_relation:
          row.user_id === input.userId ? 'owner' : 'companion',
        viewer_cheered_team_id:
          row.user_id === input.userId ? null : row.viewer_cheered_team_id,
        viewer_cheered_team_short_name:
          row.user_id === input.userId
            ? null
            : row.viewer_cheered_team_short_name,
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
  cheeredTeamId?: number | null;
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
         cheered_team_id = ?,
         my_team_score = ?,
         opponent_score = ?,
         result = ?,
         is_score_modified = ?,
         last_modified_by_user_id = ?
     WHERE id = ?`,
    [
      input.memo ?? null,
      input.watchType ?? 'stadium',
      input.cheeredTeamId ?? null,
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

/** 내가 쓴 기록만 (동행 기록 제외). 응원팀이 바뀌었을 때 저장 스코어를 다시 맞추는 데 쓴다. */
export async function listOwnedAttendanceRecords(userId: number) {
  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql()}
     WHERE ar.user_id = ?
     ORDER BY g.game_date ASC`,
    [userId],
  );

  return rows.map((row) => toAttendanceRecord(row));
}

export async function listAttendanceRecordsByGame(gameId: number) {
  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql()}
     WHERE ar.game_id = ?`,
    [gameId],
  );

  return rows.map((row) => toAttendanceRecord(row));
}

/** 저장 스코어·결과를 바꾸고 직접 고친 표시(is_score_modified)를 지운다. */
export async function updateAttendanceStoredScores(input: {
  id: number;
  myTeamScore: number | null;
  opponentScore: number | null;
  result: AttendanceResult | null;
}) {
  await db.execute(
    `UPDATE attendance_records
     SET my_team_score = ?,
         opponent_score = ?,
         result = ?,
         is_score_modified = 0
     WHERE id = ?`,
    [input.myTeamScore, input.opponentScore, input.result, input.id],
  );
}

export async function updateAttendanceStoredResult(input: {
  id: number;
  result: AttendanceResult;
}) {
  await db.execute(
    `UPDATE attendance_records
     SET result = ?
     WHERE id = ?`,
    [input.result, input.id],
  );
}

/**
 * 직관 통계·명예타이틀. 기간을 안 주면 한국 시간 기준 올해.
 * 홈 화면과 /me 가 모두 이 값을 쓴다 (웹은 따로 계산하지 않는다).
 */
export async function getAttendanceStats(
  userId: number,
  input?: { from?: string; to?: string },
) {
  const user = await findUserById(userId);
  const favoriteTeamId = getFavoriteTeamIdFromUser(user);
  const range =
    input?.from && input.to
      ? { from: input.from, to: input.to }
      : getKoreaYearRange();
  // 목록에는 내가 쓴 기록과 동행으로 수락한 기록만 들어 있다.
  const records = await listAttendanceRecords({ userId, ...range });

  return computeAttendanceStats(records, favoriteTeamId);
}
