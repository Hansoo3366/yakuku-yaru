import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import type { ParsedKboGame } from './parse-schedule.js';

export const KBO_EXTERNAL_SOURCE = 'kbo';

type GameIdRow = RowDataPacket & { id: number };

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
    }));

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
        KBO_EXTERNAL_SOURCE,
        game.externalId,
        existingId,
      ],
    );

    return 'updated';
  }

  await db.execute<ResultSetHeader>(
    `INSERT INTO games (
       game_date,
       stadium,
       home_team_id,
       away_team_id,
       home_score,
       away_score,
       status,
       external_source,
       external_id
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.gameDate,
      game.stadium,
      homeTeamId,
      awayTeamId,
      game.homeScore,
      game.awayScore,
      game.status,
      KBO_EXTERNAL_SOURCE,
      game.externalId,
    ],
  );

  return 'inserted';
}
