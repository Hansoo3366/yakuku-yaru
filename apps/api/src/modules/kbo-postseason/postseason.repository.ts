import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { listTeamStandings } from '../kbo-team-rank/team-rank.repository.js';
import {
  buildPostseasonBracket,
  type PostseasonGameInput,
  type PostseasonSeriesId,
} from './postseason-bracket.js';

/** 정규시즌 상위 5팀이 포스트시즌에 나간다 */
const POSTSEASON_TEAM_COUNT = 5;

type PostseasonGameRow = RowDataPacket & {
  id: number;
  kbo_series_id: PostseasonSeriesId;
  game_date: Date;
  status: PostseasonGameInput['status'];
  home_team_id: number;
  home_short_name: string;
  home_name: string;
  away_team_id: number;
  away_short_name: string;
  away_name: string;
  home_score: number | null;
  away_score: number | null;
};

async function listPostseasonGames(seasonYear: number) {
  const [rows] = await db.query<PostseasonGameRow[]>(
    `SELECT
       g.id,
       g.kbo_series_id,
       g.game_date,
       g.status,
       g.home_team_id,
       ht.short_name AS home_short_name,
       ht.name AS home_name,
       g.away_team_id,
       awt.short_name AS away_short_name,
       awt.name AS away_name,
       g.home_score,
       g.away_score
     FROM games g
     INNER JOIN teams ht ON ht.id = g.home_team_id
     INNER JOIN teams awt ON awt.id = g.away_team_id
     WHERE g.kbo_series_id IN ('4', '3', '5', '7')
       AND g.game_date >= ?
       AND g.game_date < ?
     ORDER BY g.game_date ASC`,
    [`${seasonYear}-01-01 00:00:00`, `${seasonYear + 1}-01-01 00:00:00`],
  );

  return rows.map(
    (row): PostseasonGameInput => ({
      id: Number(row.id),
      seriesId: row.kbo_series_id,
      gameDate: row.game_date.toISOString(),
      status: row.status,
      homeTeam: {
        teamId: Number(row.home_team_id),
        shortName: row.home_short_name,
        name: row.home_name,
      },
      awayTeam: {
        teamId: Number(row.away_team_id),
        shortName: row.away_short_name,
        name: row.away_name,
      },
      homeScore: row.home_score,
      awayScore: row.away_score,
    }),
  );
}

export async function getPostseasonBracket(seasonYear: number) {
  const [games, standings] = await Promise.all([
    listPostseasonGames(seasonYear),
    listTeamStandings(seasonYear),
  ]);

  return buildPostseasonBracket({
    seasonYear,
    seeds: (standings?.items ?? [])
      .filter((item) => item.rank <= POSTSEASON_TEAM_COUNT)
      .map((item) => ({
        teamId: item.teamId,
        shortName: item.teamShortName,
        name: item.teamName,
        seed: item.rank,
      })),
    games,
  });
}
