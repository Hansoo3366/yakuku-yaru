import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import {
  findUserById,
  getFavoriteTeamIdFromUser,
} from '../users/user.repository.js';
import {
  countsTowardWinRateForRecord,
  isTeamInGame,
  resolveStorageOutcomeTeamId,
} from './attendance-game.js';
import {
  resolveAttendanceOutcome,
  resolveAttendanceScoresFromGame,
  resolveAttendanceTitle,
  resolveAttendanceTitles,
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

function getStadiumTitleName(stadium: string) {
  if (stadium.includes('잠실')) return '잠실';
  if (stadium.includes('고척')) return '고척돔';
  if (stadium.includes('광주') || stadium.includes('챔피언스')) return '챔필';
  if (stadium.includes('대구')) return '라팍';
  if (stadium.includes('대전')) return '대전';
  if (stadium.includes('사직')) return '사직';
  if (stadium.includes('창원')) return '창원NC파크';
  if (stadium.includes('수원')) return '수원';
  if (stadium.includes('문학') || stadium.includes('랜더스')) return '문학';
  return stadium.replace(/야구장|구장|스타디움/g, '').trim() || stadium;
}

function getAttendanceRecordStatsPriority(record: AttendanceRecord) {
  let priority = 0;

  if (record.watchType === 'stadium') {
    priority += 4;
  }

  if (record.viewerRelation === 'owner') {
    priority += 2;
  }

  return priority;
}

function dedupeAttendanceRecordsByGame(records: AttendanceRecord[]) {
  const byGame = new Map<number, AttendanceRecord>();

  for (const record of records) {
    const previous = byGame.get(record.gameId);

    if (
      !previous ||
      getAttendanceRecordStatsPriority(record) >
        getAttendanceRecordStatsPriority(previous)
    ) {
      byGame.set(record.gameId, record);
    }
  }

  return [...byGame.values()].sort(
    (a, b) =>
      new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime(),
  );
}

function calculateStatsWinRate(winCount: number, loseCount: number, drawCount: number) {
  const total = winCount + loseCount + drawCount;

  return total ? Math.round((winCount / total) * 1000) / 10 : 0;
}

function getAttendanceTitleMetrics(
  records: AttendanceRecord[],
  favoriteTeamId: number | null,
) {
  const stadiumRecords = records.filter((record) => record.watchType === 'stadium');
  const stadiumCounts = new Map<string, number>();
  let domeStadiumCount = 0;
  let cancelledCount = 0;
  let oneRunGameCount = 0;
  let kennedyScoreCount = 0;
  let pitcherDuelCount = 0;
  let doubleDigitLossCount = 0;
  let homeStadiumCount = 0;
  let awayStadiumCount = 0;
  let summerDayGameCount = 0;
  let currentLosingStreak = 0;
  let maxLosingStreak = 0;

  for (const record of stadiumRecords) {
    const stadium = record.game.stadium;
    stadiumCounts.set(stadium, (stadiumCounts.get(stadium) ?? 0) + 1);

    if (stadium.includes('고척') || stadium.includes('스카이돔')) {
      domeStadiumCount += 1;
    }

    if (record.game.status === 'cancelled') {
      cancelledCount += 1;
    }

    const gameDate = new Date(record.game.gameDate);
    const month = gameDate.getMonth() + 1;
    const hour = gameDate.getHours();

    if ((month === 7 || month === 8) && hour === 14) {
      summerDayGameCount += 1;
    }

    if (favoriteTeamId && record.game.homeTeam.id === favoriteTeamId) {
      homeStadiumCount += 1;
    } else if (favoriteTeamId && record.game.awayTeam.id === favoriteTeamId) {
      awayStadiumCount += 1;
    }

    const homeScore = record.game.homeScore;
    const awayScore = record.game.awayScore;

    if (homeScore === null || awayScore === null) {
      continue;
    }

    const scoreDiff = Math.abs(homeScore - awayScore);

    if (scoreDiff === 1) {
      oneRunGameCount += 1;
    }

    if (
      (homeScore === 8 && awayScore === 7) ||
      (homeScore === 7 && awayScore === 8)
    ) {
      kennedyScoreCount += 1;
    }

    if (
      (homeScore === 1 && awayScore === 0) ||
      (homeScore === 0 && awayScore === 1) ||
      (homeScore === 0 && awayScore === 0)
    ) {
      pitcherDuelCount += 1;
    }

    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (outcome === 'lose' && scoreDiff >= 10) {
      doubleDigitLossCount += 1;
    }
  }

  for (const record of [...stadiumRecords].sort(
    (a, b) =>
      new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime(),
  )) {
    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (outcome === 'lose') {
      currentLosingStreak += 1;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
    } else if (outcome === 'win' || outcome === 'draw') {
      currentLosingStreak = 0;
    }
  }

  const dominant = [...stadiumCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    awayStadiumCount,
    homeStadiumCount,
    cancelledCount,
    domeStadiumCount,
    distinctStadiumCount: stadiumCounts.size,
    dominantStadiumName: dominant ? getStadiumTitleName(dominant[0]) : null,
    dominantStadiumRatio:
      dominant && stadiumRecords.length ? dominant[1] / stadiumRecords.length : 0,
    oneRunGameCount,
    kennedyScoreCount,
    pitcherDuelCount,
    doubleDigitLossCount,
    maxLosingStreak,
    summerDayGameCount,
  };
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

function getCurrentYearAttendanceRange() {
  const year = new Date().getFullYear();

  return {
    from: `${year}-01-01`,
    to: `${year + 1}-01-01`,
  };
}

export async function getAttendanceStats(
  userId: number,
  input?: { from?: string; to?: string },
) {
  const user = await findUserById(userId);
  const favoriteTeamId = getFavoriteTeamIdFromUser(user);
  const range =
    input?.from && input.to ? { from: input.from, to: input.to } : getCurrentYearAttendanceRange();

  await reconcileAttendanceScoresForUser(userId);

  const records = await listAttendanceRecords({ userId, ...range });
  const statsRecords = records.filter(
    (record) =>
      record.viewerRelation === 'owner' ||
      record.viewerRelation === 'companion',
  );
  const uniqueStatsRecords = dedupeAttendanceRecordsByGame(statsRecords);
  const countable = uniqueStatsRecords.filter((record) =>
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
  let overallWinCount = 0;
  let overallLoseCount = 0;
  let overallDrawCount = 0;
  let overallStadiumWinCount = 0;
  let overallStadiumLoseCount = 0;
  let overallStadiumDrawCount = 0;
  let overallHomeWinCount = 0;
  let overallHomeLoseCount = 0;
  let overallHomeDrawCount = 0;
  let favoriteTeamStadiumCount = 0;
  let favoriteTeamWinCount = 0;
  let favoriteTeamLoseCount = 0;
  let favoriteTeamDrawCount = 0;
  let favoriteTeamStadiumWinCount = 0;
  let favoriteTeamStadiumLoseCount = 0;
  let favoriteTeamStadiumDrawCount = 0;
  let overallCancelledCount = 0;
  let overallStadiumCancelledCount = 0;
  let overallHomeCancelledCount = 0;
  let favoriteTeamStadiumCancelledCount = 0;
  let stadiumWinCount = 0;
  let homeWinCount = 0;
  let countableStadium = 0;
  let countableHome = 0;

  for (const record of uniqueStatsRecords) {
    if (record.watchType === 'stadium') {
      stadiumCount += 1;
    } else if (record.watchType === 'home') {
      homeCount += 1;
    }

    const isFavoriteTeamStadium =
      Boolean(favoriteTeamId) &&
      isTeamInGame(record.game, favoriteTeamId) &&
      record.watchType === 'stadium';

    if (favoriteTeamId && isTeamInGame(record.game, favoriteTeamId)) {
      if (record.watchType === 'stadium') {
        favoriteTeamStadiumCount += 1;
      }
    }

    if (record.game.status === 'cancelled') {
      overallCancelledCount += 1;
      if (record.watchType === 'stadium') {
        overallStadiumCancelledCount += 1;
      } else if (record.watchType === 'home') {
        overallHomeCancelledCount += 1;
      }
      if (isFavoriteTeamStadium) {
        favoriteTeamStadiumCancelledCount += 1;
      }
    }

    const overallOutcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (overallOutcome === 'win') {
      overallWinCount += 1;
      if (record.watchType === 'stadium') {
        overallStadiumWinCount += 1;
      } else if (record.watchType === 'home') {
        overallHomeWinCount += 1;
      }
    } else if (overallOutcome === 'lose') {
      overallLoseCount += 1;
      if (record.watchType === 'stadium') {
        overallStadiumLoseCount += 1;
      } else if (record.watchType === 'home') {
        overallHomeLoseCount += 1;
      }
    } else if (overallOutcome === 'draw') {
      overallDrawCount += 1;
      if (record.watchType === 'stadium') {
        overallStadiumDrawCount += 1;
      } else if (record.watchType === 'home') {
        overallHomeDrawCount += 1;
      }
    }

    if (
      favoriteTeamId &&
      isTeamInGame(record.game, favoriteTeamId) &&
      record.watchType === 'stadium'
    ) {
      if (overallOutcome === 'win') {
        favoriteTeamStadiumWinCount += 1;
      } else if (overallOutcome === 'lose') {
        favoriteTeamStadiumLoseCount += 1;
      } else if (overallOutcome === 'draw') {
        favoriteTeamStadiumDrawCount += 1;
      }
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
      favoriteTeamWinCount += 1;
      if (record.watchType === 'stadium') {
        stadiumWinCount += 1;
      } else if (record.watchType === 'home') {
        homeWinCount += 1;
      }
    } else if (outcome === 'lose') {
      loseCount += 1;
      favoriteTeamLoseCount += 1;
    } else {
      drawCount += 1;
      favoriteTeamDrawCount += 1;
    }
  }

  const decidedCountable = winCount + loseCount + drawCount;
  const winRate = calculateStatsWinRate(winCount, loseCount, drawCount);
  const stadiumWinRate = countableStadium
    ? Math.round((stadiumWinCount / countableStadium) * 1000) / 10
    : 0;
  const homeWinRate = countableHome
    ? Math.round((homeWinCount / countableHome) * 1000) / 10
    : 0;
  const overallWinRate = calculateStatsWinRate(
    overallWinCount,
    overallLoseCount,
    overallDrawCount,
  );
  const overallStadiumWinRate = calculateStatsWinRate(
    overallStadiumWinCount,
    overallStadiumLoseCount,
    overallStadiumDrawCount,
  );
  const overallHomeWinRate = calculateStatsWinRate(
    overallHomeWinCount,
    overallHomeLoseCount,
    overallHomeDrawCount,
  );
  const favoriteTeamStadiumWinRate = calculateStatsWinRate(
    favoriteTeamStadiumWinCount,
    favoriteTeamStadiumLoseCount,
    favoriteTeamStadiumDrawCount,
  );

  const titleMetrics = getAttendanceTitleMetrics(
    uniqueStatsRecords,
    favoriteTeamId,
  );
  const titles = resolveAttendanceTitles({
    totalCount: uniqueStatsRecords.length,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    winRate,
    ...titleMetrics,
  });

  return {
    totalCount: uniqueStatsRecords.length,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    overallWinCount,
    overallLoseCount,
    overallDrawCount,
    overallWinRate,
    overallStadiumWinCount,
    overallStadiumLoseCount,
    overallStadiumDrawCount,
    overallStadiumWinRate,
    overallHomeWinCount,
    overallHomeLoseCount,
    overallHomeDrawCount,
    overallHomeWinRate,
    favoriteTeamStadiumCount,
    favoriteTeamWinCount,
    favoriteTeamLoseCount,
    favoriteTeamDrawCount,
    favoriteTeamStadiumWinCount,
    favoriteTeamStadiumLoseCount,
    favoriteTeamStadiumDrawCount,
    favoriteTeamStadiumWinRate,
    overallCancelledCount,
    overallStadiumCancelledCount,
    overallHomeCancelledCount,
    favoriteTeamStadiumCancelledCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: titles[0]?.label ?? resolveAttendanceTitle(decidedCountable, winRate),
    titles,
  };
}
