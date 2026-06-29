import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import {
  findUserById,
  getFavoriteTeamIdFromUser,
} from '../users/user.repository.js';
import {
  countsTowardWinRateForRecord,
  resolveStorageOutcomeTeamId,
} from './attendance-game.js';
import {
  resolveAttendanceOutcome,
  resolveAttendanceScoresFromGame,
  resolveAttendanceTitle,
} from './attendance-score.js';
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

function attendanceSelectSql(extraSelect = '') {
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
  await reconcileAttendanceScoresForUser(input.userId);

  const params: Array<number | string> = [input.userId, input.userId];
  const dateFilter =
    input.from && input.to ? 'AND g.game_date >= ? AND g.game_date < ?' : '';

  if (input.from && input.to) {
    params.push(input.from, input.to);
  }

  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql(
      `,
      viewer_ac.cheered_team_id AS viewer_cheered_team_id,
      viewer_ct.short_name AS viewer_cheered_team_short_name`,
    )}
     LEFT JOIN attendance_companions viewer_ac
       ON viewer_ac.attendance_record_id = ar.id
      AND viewer_ac.user_id = ?
      AND viewer_ac.status = 'accepted'
     LEFT JOIN teams viewer_ct ON viewer_ct.id = viewer_ac.cheered_team_id
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

async function listOwnerAttendanceRecordsForStats(userId: number) {
  const [rows] = await db.query<AttendanceRecordRow[]>(
    `${attendanceSelectSql()}
     WHERE ar.user_id = ?
     ORDER BY g.game_date ASC`,
    [userId],
  );

  return rows.map((row) => toAttendanceRecord(row));
}

function storageOutcomeTeamId(record: AttendanceRecord) {
  return resolveStorageOutcomeTeamId({
    game: record.game,
    ownerFavoriteTeamId: record.ownerFavoriteTeamId,
    cheeredTeamId: record.cheeredTeamId,
  });
}

async function reconcileAttendanceRecord(record: AttendanceRecord) {
  if (record.game.status === 'cancelled') {
    const needsClear =
      record.myTeamScore !== null ||
      record.opponentScore !== null ||
      record.result !== null ||
      record.isScoreModified;

    if (!needsClear) {
      return;
    }

    await db.execute(
      `UPDATE attendance_records
       SET my_team_score = NULL,
           opponent_score = NULL,
           result = NULL,
           is_score_modified = 0
       WHERE id = ?`,
      [record.id],
    );
    return;
  }

  const outcomeTeamId = storageOutcomeTeamId(record);
  const fromGame = resolveAttendanceScoresFromGame(record.game, outcomeTeamId);

  if (fromGame) {
    const needsUpdate =
      record.myTeamScore !== fromGame.myTeamScore ||
      record.opponentScore !== fromGame.opponentScore ||
      record.result !== fromGame.result ||
      record.isScoreModified;

    if (!needsUpdate) {
      return;
    }

    await db.execute(
      `UPDATE attendance_records
       SET my_team_score = ?,
           opponent_score = ?,
           result = ?,
           is_score_modified = 0
       WHERE id = ?`,
      [
        fromGame.myTeamScore,
        fromGame.opponentScore,
        fromGame.result,
        record.id,
      ],
    );
    return;
  }

  const outcome = resolveAttendanceOutcome(record, outcomeTeamId);

  if (!outcome || outcome === record.result) {
    return;
  }

  await db.execute(
    `UPDATE attendance_records
     SET result = ?
     WHERE id = ?`,
    [outcome, record.id],
  );
}

async function reconcileAttendanceScoresForUser(userId: number) {
  const records = await listOwnerAttendanceRecordsForStats(userId);

  for (const record of records) {
    await reconcileAttendanceRecord(record);
  }
}

export async function reconcileAttendanceRecordById(recordId: number) {
  const record = await findAttendanceRecordById(recordId);

  if (!record) {
    return null;
  }

  await reconcileAttendanceRecord(record);
  const [refreshed] = await attachCompanions([
    (await findAttendanceRecordById(recordId))!,
  ]);

  return refreshed;
}

export async function getAttendanceStats(userId: number) {
  const user = await findUserById(userId);
  const favoriteTeamId = getFavoriteTeamIdFromUser(user);

  await reconcileAttendanceScoresForUser(userId);

  const records = await listAttendanceRecords({ userId });
  const statsRecords = records.filter(
    (record) =>
      record.viewerRelation === 'owner' ||
      record.viewerRelation === 'companion',
  );
  const countable = statsRecords.filter((record) =>
    countsTowardWinRateForRecord({
      game: record.game,
      favoriteTeamId,
      cheeredTeamId: record.cheeredTeamId ?? null,
      viewerCheeredTeamId: record.viewerCheeredTeamId ?? null,
      viewerRelation: record.viewerRelation,
      ownerFavoriteTeamId: record.ownerFavoriteTeamId ?? null,
    }),
  );

  let stadiumCount = 0;
  let homeCount = 0;
  let winCount = 0;
  let loseCount = 0;
  let drawCount = 0;
  let stadiumWinCount = 0;
  let homeWinCount = 0;
  let countableStadium = 0;
  let countableHome = 0;

  for (const record of statsRecords) {
    if (record.watchType === 'stadium') {
      stadiumCount += 1;
    } else if (record.watchType === 'home') {
      homeCount += 1;
    }
  }

  for (const record of countable) {
    if (record.watchType === 'stadium') {
      countableStadium += 1;
    } else if (record.watchType === 'home') {
      countableHome += 1;
    }

    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (!outcome) {
      continue;
    }

    if (outcome === 'win') {
      winCount += 1;
      if (record.watchType === 'stadium') {
        stadiumWinCount += 1;
      } else if (record.watchType === 'home') {
        homeWinCount += 1;
      }
    } else if (outcome === 'lose') {
      loseCount += 1;
    } else {
      drawCount += 1;
    }
  }

  const decidedCountable = winCount + loseCount + drawCount;
  const winRate = decidedCountable
    ? Math.round((winCount / decidedCountable) * 1000) / 10
    : 0;
  const stadiumWinRate = countableStadium
    ? Math.round((stadiumWinCount / countableStadium) * 1000) / 10
    : 0;
  const homeWinRate = countableHome
    ? Math.round((homeWinCount / countableHome) * 1000) / 10
    : 0;

  return {
    totalCount: statsRecords.length,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: resolveAttendanceTitle(decidedCountable, winRate),
  };
}
