import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import type { ParsedKboGame } from './parse-schedule.js';
import { syncAttendanceScoresForGame } from '../attendance/attendance-score.js';

export const KBO_EXTERNAL_SOURCE = 'kbo';

type GameIdRow = RowDataPacket & { id: number };
type GameMatchRow = RowDataPacket & {
  id: number;
  external_id: string | null;
};
type CountRow = RowDataPacket & { count: number };

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

async function countAttendanceRecordsForGame(gameId: number) {
  const [rows] = await db.query<CountRow[]>(
    `SELECT COUNT(*) AS count
     FROM attendance_records
     WHERE game_id = ?`,
    [gameId],
  );

  return rows[0]?.count ?? 0;
}

async function mergeDuplicateGameIntoCanonical(input: {
  canonicalGameId: number;
  duplicateGameId: number;
}) {
  if (input.canonicalGameId === input.duplicateGameId) {
    return;
  }

  await db.execute(
    `INSERT IGNORE INTO game_reminders (user_id, game_id, reminder_type, created_at)
     SELECT user_id, ?, reminder_type, created_at
     FROM game_reminders
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );
  await db.execute(`DELETE FROM game_reminders WHERE game_id = ?`, [
    input.duplicateGameId,
  ]);

  await db.execute(
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
  await db.execute(`DELETE FROM game_starting_pitchers WHERE game_id = ?`, [
    input.duplicateGameId,
  ]);

  await db.execute(
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
  await db.execute(`DELETE FROM game_lineups WHERE game_id = ?`, [
    input.duplicateGameId,
  ]);

  await db.execute(
    `UPDATE IGNORE attendance_records
     SET game_id = ?
     WHERE game_id = ?`,
    [input.canonicalGameId, input.duplicateGameId],
  );

  if ((await countAttendanceRecordsForGame(input.duplicateGameId)) > 0) {
    console.warn(
      `[kbo-sync] 중복 경기 ${input.duplicateGameId} 삭제 보류: 충돌하는 직관 기록이 남아있습니다.`,
    );
    return;
  }

  await db.execute(`DELETE FROM games WHERE id = ?`, [input.duplicateGameId]);
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
           external_id = ?
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
        existingId,
      ],
    );

    if (game.homeScore !== null && game.awayScore !== null) {
      await syncAttendanceScoresForGame(existingId);
    }

    await mergeSameDayDuplicateGames({
      canonicalGameId: existingId,
      gameDate: game.gameDate,
      homeTeamId,
      awayTeamId,
    });

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
       external_id
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  );

  if (
    insertResult.insertId &&
    game.homeScore !== null &&
    game.awayScore !== null
  ) {
    await syncAttendanceScoresForGame(insertResult.insertId);
  }

  if (insertResult.insertId) {
    await mergeSameDayDuplicateGames({
      canonicalGameId: insertResult.insertId,
      gameDate: game.gameDate,
      homeTeamId,
      awayTeamId,
    });
  }

  return 'inserted';
}
