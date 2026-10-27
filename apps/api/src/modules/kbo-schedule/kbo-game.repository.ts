import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { db, withTransaction } from '../../config/database.js';
import type { ParsedKboGame } from './parse-schedule.js';
import {
  selectGamesMissingFromSchedule,
  type ScheduleWindow,
} from './stale-games.js';
import { reconcileAttendanceRecordsForGame } from '../attendance/attendance.repository.js';

export const KBO_EXTERNAL_SOURCE = 'kbo';

type GameIdRow = RowDataPacket & { id: number };
type GameMatchRow = RowDataPacket & {
  id: number;
  external_id: string | null;
};
type CountRow = RowDataPacket & { count: number };
type ScheduledGameRow = RowDataPacket & {
  id: number;
  external_id: string | null;
  attendance_count: number;
};

type TeamIdRow = RowDataPacket & {
  id: number;
  short_name: string;
};

export async function listTeamIdsByShortName() {
  const [rows] = await db.query<TeamIdRow[]>(
    `SELECT id, short_name FROM teams ORDER BY id ASC`,
  );

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.short_name, row.id);
  }

  return map;
}

async function findGameIdByExternalId(externalId: string) {
  const [rows] = await db.query<GameIdRow[]>(
    `SELECT id
     FROM games
     WHERE external_source = ?
       AND external_id = ?
     LIMIT 1`,
    [KBO_EXTERNAL_SOURCE, externalId],
  );

  return rows[0]?.id ?? null;
}

async function findGameIdByMatch(input: {
  gameDate: string;
  homeTeamId: number;
  awayTeamId: number;
}) {
  const [rows] = await db.query<GameIdRow[]>(
    `SELECT id
     FROM games
     WHERE game_date = ?
       AND home_team_id = ?
       AND away_team_id = ?
     LIMIT 1`,
    [input.gameDate, input.homeTeamId, input.awayTeamId],
  );

  return rows[0]?.id ?? null;
}

async function findGameIdsBySameDayMatch(input: {
  gameDate: string;
  homeTeamId: number;
  awayTeamId: number;
}) {
  const [rows] = await db.query<GameMatchRow[]>(
    `SELECT id, external_id
     FROM games
     WHERE DATE(game_date) = DATE(?)
       AND home_team_id = ?
       AND away_team_id = ?
       AND external_source = ?
     ORDER BY
       CASE WHEN game_date = ? THEN 0 ELSE 1 END,
       CASE WHEN external_id LIKE 'pending-%' THEN 0 ELSE 1 END,
       id ASC`,
    [
      input.gameDate,
      input.homeTeamId,
      input.awayTeamId,
      KBO_EXTERNAL_SOURCE,
      input.gameDate,
    ],
  );

  return rows;
}

/**
 * 같은 날 같은 대진으로 중복 생성된 경기를 정본 경기로 합친다.
 * 여러 테이블을 옮기므로 한 트랜잭션으로 묶어, 중간에 실패하면 아무것도 바뀌지 않게 한다.
 */
async function mergeDuplicateGameIntoCanonical(input: {
  canonicalGameId: number;
  duplicateGameId: number;
}) {
  if (input.canonicalGameId === input.duplicateGameId) {
    return;
  }

  await withTransaction((connection) => moveDuplicateGameData(connection, input));
}

async function moveDuplicateGameData(
  connection: PoolConnection,
  input: { canonicalGameId: number; duplicateGameId: number },
) {
  await connection.execute(
    `INSERT IGNORE INTO game_reminders (user_id, game_id, reminder_type, created_at)
     SELECT user_id, ?, reminder_type, created_at
     FROM game_reminders
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );
  await connection.execute(`DELETE FROM game_reminders WHERE game_id = ?`, [
    input.duplicateGameId,
  ]);

  await connection.execute(
    `INSERT IGNORE INTO game_starting_pitchers (
       game_id,
       team_id,
       player_id,
       is_confirmed,
       era,
       war,
       games,
       starter_average_innings,
       quality_starts,
       whip,
       season_record,
       source,
       synced_at,
       created_at,
       updated_at
     )
     SELECT
       ?,
       team_id,
       player_id,
       is_confirmed,
       era,
       war,
       games,
       starter_average_innings,
       quality_starts,
       whip,
       season_record,
       source,
       synced_at,
       created_at,
       updated_at
     FROM game_starting_pitchers
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );
  await connection.execute(`DELETE FROM game_starting_pitchers WHERE game_id = ?`, [
    input.duplicateGameId,
  ]);

  await connection.execute(
    `INSERT IGNORE INTO game_lineups (
       game_id,
       team_id,
       player_id,
       batting_order,
       field_position,
       war,
       is_starter,
       source,
       synced_at,
       created_at,
       updated_at
     )
     SELECT
       ?,
       team_id,
       player_id,
       batting_order,
       field_position,
       war,
       is_starter,
       source,
       synced_at,
       created_at,
       updated_at
     FROM game_lineups
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );
  await connection.execute(`DELETE FROM game_lineups WHERE game_id = ?`, [
    input.duplicateGameId,
  ]);

  await connection.execute(
    `UPDATE IGNORE attendance_viewer_preferences
     SET game_id = ?
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );

  await connection.execute(
    `UPDATE IGNORE attendance_records
     SET game_id = ?
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );

  const [remainingRows] = await connection.query<CountRow[]>(
    `SELECT COUNT(*) AS count
     FROM attendance_records
     WHERE game_id = ?`,
    [input.duplicateGameId],
  );

  if (Number(remainingRows[0]?.count ?? 0) > 0) {
    console.warn(
      `[kbo-sync] 중복 경기 ${input.duplicateGameId} 삭제 보류: 충돌하는 직관 기록이 남아있습니다.`,
    );
    return;
  }

  await connection.execute(`DELETE FROM games WHERE id = ?`, [input.duplicateGameId]);
}

async function mergeSameDayDuplicateGames(input: {
  canonicalGameId: number;
  gameDate: string;
  homeTeamId: number;
  awayTeamId: number;
}) {
  const duplicates = await findGameIdsBySameDayMatch({
    gameDate: input.gameDate,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
  });

  for (const duplicate of duplicates) {
    if (duplicate.id === input.canonicalGameId) {
      continue;
    }

    await mergeDuplicateGameIntoCanonical({
      canonicalGameId: input.canonicalGameId,
      duplicateGameId: duplicate.id,
    });
  }
}

export type UpsertKboGameResult = 'inserted' | 'updated' | 'skipped';

export async function upsertKboGame(
  game: ParsedKboGame,
  teamIds: Map<string, number>,
  seriesId: string,
): Promise<UpsertKboGameResult> {
  const homeTeamId = teamIds.get(game.homeTeamShortName);
  const awayTeamId = teamIds.get(game.awayTeamShortName);

  if (!homeTeamId || !awayTeamId) {
    console.warn(
      `[kbo-sync] 팀 매핑 실패: ${game.awayTeamShortName} vs ${game.homeTeamShortName} (${game.externalId})`,
    );
    return 'skipped';
  }

  const existingId =
    (await findGameIdByExternalId(game.externalId)) ??
    (await findGameIdByMatch({
      gameDate: game.gameDate,
      homeTeamId,
      awayTeamId,
    })) ??
    (await findGameIdsBySameDayMatch({
      gameDate: game.gameDate,
      homeTeamId,
      awayTeamId,
    }))[0]?.id ??
    null;

  if (existingId) {
    await db.execute(
      `UPDATE games
       SET game_date = ?,
           stadium = ?,
           home_team_id = ?,
           away_team_id = ?,
           home_score = ?,
           away_score = ?,
           status = ?,
           cancellation_reason = ?,
           external_source = ?,
           external_id = ?,
           kbo_series_id = ?
       WHERE id = ?`,
      [
        game.gameDate,
        game.stadium,
        homeTeamId,
        awayTeamId,
        game.homeScore,
        game.awayScore,
        game.status,
        game.cancellationReason,
        KBO_EXTERNAL_SOURCE,
        game.externalId,
        seriesId,
        existingId,
      ],
    );

    await mergeSameDayDuplicateGames({
      canonicalGameId: existingId,
      gameDate: game.gameDate,
      homeTeamId,
      awayTeamId,
    });

    // 병합으로 옮겨온 기록까지 포함해 스코어 확정·취소 전환을 직관 기록에 반영한다. 바뀐 기록만 UPDATE 된다.
    await reconcileAttendanceRecordsForGame(existingId);

    return 'updated';
  }

  const [insertResult] = await db.execute<ResultSetHeader>(
    `INSERT INTO games (
       game_date,
       stadium,
       home_team_id,
       away_team_id,
       home_score,
       away_score,
       status,
       cancellation_reason,
       external_source,
       external_id,
       kbo_series_id
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.gameDate,
      game.stadium,
      homeTeamId,
      awayTeamId,
      game.homeScore,
      game.awayScore,
      game.status,
      game.cancellationReason,
      KBO_EXTERNAL_SOURCE,
      game.externalId,
      seriesId,
    ],
  );

  if (insertResult.insertId) {
    await mergeSameDayDuplicateGames({
      canonicalGameId: insertResult.insertId,
      gameDate: game.gameDate,
      homeTeamId,
      awayTeamId,
    });
    await reconcileAttendanceRecordsForGame(insertResult.insertId);
  }

  return 'inserted';
}

export type RemoveStaleKboGamesResult = { deleted: number; cancelled: number };

/**
 * 범위 안의 KBO 예정 경기 가운데 방금 받은 일정에 없는 것을 정리한다.
 * 직관 기록이 없으면 지우고(알림·라인업은 함께 지워진다), 있으면 취소로 바꿔 기록을 남긴다.
 */
export async function removeKboGamesMissingFromSchedule(
  window: ScheduleWindow,
  scheduledExternalIds: ReadonlySet<string>,
): Promise<RemoveStaleKboGamesResult> {
  const [rows] = await db.query<ScheduledGameRow[]>(
    `SELECT
       g.id,
       g.external_id,
       (SELECT COUNT(*) FROM attendance_records ar WHERE ar.game_id = g.id) AS attendance_count
     FROM games g
     WHERE g.external_source = ?
       AND g.status = 'scheduled'
       AND g.game_date >= ?
       AND g.game_date < ?`,
    [KBO_EXTERNAL_SOURCE, window.from, window.to],
  );

  const actions = selectGamesMissingFromSchedule(
    rows.map((row) => ({
      id: Number(row.id),
      externalId: row.external_id,
      attendanceCount: Number(row.attendance_count),
    })),
    scheduledExternalIds,
  );

  let deleted = 0;
  let cancelled = 0;

  for (const { id, action } of actions) {
    if (action === 'delete') {
      await db.execute(`DELETE FROM games WHERE id = ?`, [id]);
      deleted += 1;
      continue;
    }

    await db.execute(
      `UPDATE games
       SET status = 'cancelled',
           cancellation_reason = 'other'
       WHERE id = ?`,
      [id],
    );
    await reconcileAttendanceRecordsForGame(id);
    cancelled += 1;
  }

  return { deleted, cancelled };
}
