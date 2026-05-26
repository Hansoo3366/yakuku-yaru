import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type GameRow = RowDataPacket & {
  id: number;
  game_date: Date;
  stadium: string;
  home_team_id: number;
  home_team_name: string;
  home_team_short_name: string;
  home_team_color: string | null;
  home_team_ticket_url: string | null;
  away_team_id: number;
  away_team_name: string;
  away_team_short_name: string;
  away_team_color: string | null;
  away_team_ticket_url: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  ticket_url: string | null;
  ticket_open_at: Date | null;
  stadium_food_summary: string | null;
  stadium_parking_summary: string | null;
  stadium_map_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export type Game = {
  id: number;
  gameDate: Date;
  stadium: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    primaryColor: string | null;
    ticketUrl: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    primaryColor: string | null;
    ticketUrl: string | null;
  };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  ticketUrl: string | null;
  ticketOpenAt: Date | null;
  stadiumGuide: {
    foodSummary: string | null;
    parkingSummary: string | null;
    mapUrl: string | null;
  } | null;
};

function gameSelectSql() {
  return `SELECT
      g.id,
      g.game_date,
      g.stadium,
      g.home_team_id,
      ht.name AS home_team_name,
      ht.short_name AS home_team_short_name,
      ht.primary_color AS home_team_color,
      ht.ticket_url AS home_team_ticket_url,
      g.away_team_id,
      at.name AS away_team_name,
      at.short_name AS away_team_short_name,
      at.primary_color AS away_team_color,
      at.ticket_url AS away_team_ticket_url,
      g.home_score,
      g.away_score,
      g.status,
      COALESCE(g.ticket_url, ht.ticket_url) AS ticket_url,
      g.ticket_open_at,
      sg.food_summary AS stadium_food_summary,
      sg.parking_summary AS stadium_parking_summary,
      sg.map_url AS stadium_map_url,
      g.created_at,
      g.updated_at
    FROM games g
    JOIN teams ht ON ht.id = g.home_team_id
    JOIN teams at ON at.id = g.away_team_id
    LEFT JOIN stadium_guides sg ON sg.stadium = g.stadium`;
}

export function toGame(row: GameRow): Game {
  return {
    id: row.id,
    gameDate: row.game_date,
    stadium: row.stadium,
    homeTeam: {
      id: row.home_team_id,
      name: row.home_team_name,
      shortName: row.home_team_short_name,
      primaryColor: row.home_team_color,
      ticketUrl: row.home_team_ticket_url,
    },
    awayTeam: {
      id: row.away_team_id,
      name: row.away_team_name,
      shortName: row.away_team_short_name,
      primaryColor: row.away_team_color,
      ticketUrl: row.away_team_ticket_url,
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    ticketUrl: row.ticket_url,
    ticketOpenAt: row.ticket_open_at,
    stadiumGuide:
      row.stadium_food_summary || row.stadium_parking_summary || row.stadium_map_url
        ? {
            foodSummary: row.stadium_food_summary,
            parkingSummary: row.stadium_parking_summary,
            mapUrl: row.stadium_map_url,
          }
        : null,
  };
}

export async function listGames(input: {
  from: string;
  to: string;
  teamId?: number;
}) {
  const params: Array<number | string> = [input.from, input.to];
  let teamFilter = '';

  if (input.teamId) {
    teamFilter = 'AND (g.home_team_id = ? OR g.away_team_id = ?)';
    params.push(input.teamId, input.teamId);
  }

  const [rows] = await db.query<GameRow[]>(
    `${gameSelectSql()}
     WHERE g.game_date >= ?
       AND g.game_date < ?
       AND g.external_source = 'kbo'
       ${teamFilter}
     ORDER BY g.game_date ASC`,
    params,
  );

  return rows.map(toGame);
}

export async function findGameById(id: number) {
  const [rows] = await db.query<GameRow[]>(
    `${gameSelectSql()}
     WHERE g.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? toGame(rows[0]) : null;
}
