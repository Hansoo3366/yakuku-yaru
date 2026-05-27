import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import type { ParsedKboTeamStanding } from './parse-team-rank.js';

export type TeamStandingRow = {
  rank: number;
  teamId: number;
  teamShortName: string;
  teamName: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  gamesBehind: number;
};

type StandingMetaRow = RowDataPacket & {
  season_year: number;
  rank_date: Date;
  series_id: string;
  synced_at: Date;
};

export async function replaceTeamStandings(input: {
  seasonYear: number;
  rankDate: string;
  seriesId: string;
  standings: Array<ParsedKboTeamStanding & { teamId: number }>;
}) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `DELETE FROM team_standings
       WHERE season_year = ?
         AND rank_date = ?
         AND series_id = ?`,
      [input.seasonYear, input.rankDate, input.seriesId],
    );

    for (const standing of input.standings) {
      await connection.execute(
        `INSERT INTO team_standings (
           season_year,
           rank_date,
           series_id,
           team_id,
           rank_position,
           games,
           wins,
           losses,
           draws,
           win_rate,
           games_behind
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.seasonYear,
          input.rankDate,
          input.seriesId,
          standing.teamId,
          standing.rank,
          standing.games,
          standing.wins,
          standing.losses,
          standing.draws,
          standing.winRate,
          standing.gamesBehind,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getLatestTeamStandingsMeta(
  seasonYear: number,
  seriesId = '0',
) {
  const [rows] = await db.query<StandingMetaRow[]>(
    `SELECT season_year, rank_date, series_id, synced_at
     FROM team_standings
     WHERE season_year = ?
       AND series_id = ?
     ORDER BY rank_date DESC, synced_at DESC
     LIMIT 1`,
    [seasonYear, seriesId],
  );

  return rows[0] ?? null;
}

function formatRankDate(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

export async function listTeamStandings(seasonYear: number, seriesId = '0') {
  const meta = await getLatestTeamStandingsMeta(seasonYear, seriesId);

  if (!meta) {
    return null;
  }

  const [rows] = await db.query<
    (RowDataPacket & {
      rank_position: number;
      team_id: number;
      team_short_name: string;
      team_name: string;
      games: number;
      wins: number;
      losses: number;
      draws: number;
      win_rate: number;
      games_behind: number;
      rank_date: Date | string;
    })[]
  >(
    `SELECT
       ts.rank_position,
       ts.team_id,
       t.short_name AS team_short_name,
       t.name AS team_name,
       ts.games,
       ts.wins,
       ts.losses,
       ts.draws,
       ts.win_rate,
       ts.games_behind,
       ts.rank_date
     FROM team_standings ts
     INNER JOIN teams t ON t.id = ts.team_id
     WHERE ts.season_year = ?
       AND ts.series_id = ?
       AND ts.rank_date = (
         SELECT MAX(rank_date)
         FROM team_standings
         WHERE season_year = ?
           AND series_id = ?
       )
     ORDER BY ts.rank_position ASC`,
    [seasonYear, seriesId, seasonYear, seriesId],
  );

  const rankDate = formatRankDate(rows[0]?.rank_date ?? meta.rank_date);

  return {
    seasonYear,
    rankDate,
    seriesId,
    syncedAt: meta.synced_at.toISOString(),
    items: rows.map((row) => ({
      rank: Number(row.rank_position),
      teamId: Number(row.team_id),
      teamShortName: row.team_short_name,
      teamName: row.team_name,
      games: Number(row.games),
      wins: Number(row.wins),
      losses: Number(row.losses),
      draws: Number(row.draws),
      winRate: Number(row.win_rate),
      gamesBehind: Number(row.games_behind),
    })) satisfies TeamStandingRow[],
  };
}

export async function countTeamStandingsSnapshots() {
  const [rows] = await db.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(DISTINCT CONCAT(season_year, ':', rank_date, ':', series_id)) AS count
     FROM team_standings`,
  );

  return Number(rows[0]?.count ?? 0);
}
