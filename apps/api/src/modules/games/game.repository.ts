import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { calculatePlayerAge } from '../players/player-age.js';

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
  cancellation_reason: string | null;
  lineup_confirmed: number | null;
  ticket_url: string | null;
  ticket_open_at: Date | null;
  home_starting_pitcher_id: number | null;
  home_starting_pitcher_name: string | null;
  home_starting_pitcher_back_number: string | null;
  home_starting_pitcher_birth_date: Date | null;
  home_starting_pitcher_profile_image_url: string | null;
  home_starting_pitcher_throws_hand: string | null;
  home_starting_pitcher_bats_hand: string | null;
  home_starting_pitcher_confirmed: number | null;
  home_starting_pitcher_era: string | null;
  home_starting_pitcher_war: string | null;
  home_starting_pitcher_games: number | null;
  home_starting_pitcher_average_innings: string | null;
  home_starting_pitcher_quality_starts: number | null;
  home_starting_pitcher_whip: string | null;
  home_starting_pitcher_record: string | null;
  away_starting_pitcher_id: number | null;
  away_starting_pitcher_name: string | null;
  away_starting_pitcher_back_number: string | null;
  away_starting_pitcher_birth_date: Date | null;
  away_starting_pitcher_profile_image_url: string | null;
  away_starting_pitcher_throws_hand: string | null;
  away_starting_pitcher_bats_hand: string | null;
  away_starting_pitcher_confirmed: number | null;
  away_starting_pitcher_era: string | null;
  away_starting_pitcher_war: string | null;
  away_starting_pitcher_games: number | null;
  away_starting_pitcher_average_innings: string | null;
  away_starting_pitcher_quality_starts: number | null;
  away_starting_pitcher_whip: string | null;
  away_starting_pitcher_record: string | null;
  stadium_food_summary: string | null;
  stadium_parking_summary: string | null;
  stadium_map_url: string | null;
  created_at: Date;
  updated_at: Date;
};

type GameLineupRow = RowDataPacket & {
  id: number;
  team_id: number;
  player_id: number;
  player_name: string;
  player_back_number: string | null;
  player_profile_image_url: string | null;
  player_season_batting_avg: string | null;
  player_season_ops: string | null;
  player_birth_date: Date | null;
  batting_order: number | null;
  field_position: string | null;
  war: string | null;
  is_starter: number;
};

type StartingPitcher = {
  id: number;
  name: string;
  backNumber: string | null;
  age: number | null;
  profileImageUrl: string | null;
  throwsHand: string | null;
  batsHand: string | null;
  isConfirmed: boolean;
  stats: {
    era: number | null;
    war: number | null;
    games: number | null;
    starterAverageInnings: string | null;
    qualityStarts: number | null;
    whip: number | null;
    seasonRecord: string | null;
  };
};

type GameLineupPlayer = {
  id: number;
  playerId: number;
  name: string;
  backNumber: string | null;
  age: number | null;
  profileImageUrl: string | null;
  battingOrder: number | null;
  fieldPosition: string | null;
  battingAvg: number | null;
  ops: number | null;
  war: number | null;
  isStarter: boolean;
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
  cancellationReason: string | null;
  lineupConfirmed: boolean | null;
  probablePitchers: {
    home: StartingPitcher | null;
    away: StartingPitcher | null;
  };
  lineups: {
    home: GameLineupPlayer[];
    away: GameLineupPlayer[];
  };
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
      g.cancellation_reason,
      g.lineup_confirmed,
      COALESCE(g.ticket_url, ht.ticket_url) AS ticket_url,
      g.ticket_open_at,
      hsp.id AS home_starting_pitcher_id,
      hsp.name AS home_starting_pitcher_name,
      hsp.back_number AS home_starting_pitcher_back_number,
      hsp.birth_date AS home_starting_pitcher_birth_date,
      hsp.profile_image_url AS home_starting_pitcher_profile_image_url,
      hsp.throws_hand AS home_starting_pitcher_throws_hand,
      hsp.bats_hand AS home_starting_pitcher_bats_hand,
      hgsp.is_confirmed AS home_starting_pitcher_confirmed,
      hgsp.era AS home_starting_pitcher_era,
      hgsp.war AS home_starting_pitcher_war,
      hgsp.games AS home_starting_pitcher_games,
      hgsp.starter_average_innings AS home_starting_pitcher_average_innings,
      hgsp.quality_starts AS home_starting_pitcher_quality_starts,
      hgsp.whip AS home_starting_pitcher_whip,
      hgsp.season_record AS home_starting_pitcher_record,
      asp.id AS away_starting_pitcher_id,
      asp.name AS away_starting_pitcher_name,
      asp.back_number AS away_starting_pitcher_back_number,
      asp.birth_date AS away_starting_pitcher_birth_date,
      asp.profile_image_url AS away_starting_pitcher_profile_image_url,
      asp.throws_hand AS away_starting_pitcher_throws_hand,
      asp.bats_hand AS away_starting_pitcher_bats_hand,
      agsp.is_confirmed AS away_starting_pitcher_confirmed,
      agsp.era AS away_starting_pitcher_era,
      agsp.war AS away_starting_pitcher_war,
      agsp.games AS away_starting_pitcher_games,
      agsp.starter_average_innings AS away_starting_pitcher_average_innings,
      agsp.quality_starts AS away_starting_pitcher_quality_starts,
      agsp.whip AS away_starting_pitcher_whip,
      agsp.season_record AS away_starting_pitcher_record,
      sg.food_summary AS stadium_food_summary,
      sg.parking_summary AS stadium_parking_summary,
      sg.map_url AS stadium_map_url,
      g.created_at,
      g.updated_at
    FROM games g
    JOIN teams ht ON ht.id = g.home_team_id
    JOIN teams at ON at.id = g.away_team_id
    LEFT JOIN game_starting_pitchers hgsp
      ON hgsp.game_id = g.id AND hgsp.team_id = g.home_team_id
    LEFT JOIN players hsp ON hsp.id = hgsp.player_id
    LEFT JOIN game_starting_pitchers agsp
      ON agsp.game_id = g.id AND agsp.team_id = g.away_team_id
    LEFT JOIN players asp ON asp.id = agsp.player_id
    LEFT JOIN stadium_guides sg ON sg.stadium = g.stadium`;
}

function toNumberOrNull(value: string | number | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toStartingPitcher(
  row: GameRow,
  side: 'home' | 'away',
  referenceDate: Date,
) {
  const id = row[`${side}_starting_pitcher_id`];
  const name = row[`${side}_starting_pitcher_name`];

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    backNumber: row[`${side}_starting_pitcher_back_number`],
    age: calculatePlayerAge(row[`${side}_starting_pitcher_birth_date`], referenceDate),
    profileImageUrl: row[`${side}_starting_pitcher_profile_image_url`],
    throwsHand: row[`${side}_starting_pitcher_throws_hand`],
    batsHand: row[`${side}_starting_pitcher_bats_hand`],
    isConfirmed: Boolean(row[`${side}_starting_pitcher_confirmed`]),
    stats: {
      era: toNumberOrNull(row[`${side}_starting_pitcher_era`]),
      war: toNumberOrNull(row[`${side}_starting_pitcher_war`]),
      games: row[`${side}_starting_pitcher_games`],
      starterAverageInnings: row[`${side}_starting_pitcher_average_innings`],
      qualityStarts: row[`${side}_starting_pitcher_quality_starts`],
      whip: toNumberOrNull(row[`${side}_starting_pitcher_whip`]),
      seasonRecord: row[`${side}_starting_pitcher_record`],
    },
  };
}

export function toGame(row: GameRow): Game {
  const gameDate = row.game_date;

  return {
    id: row.id,
    gameDate,
    stadium: row.stadium,
    homeTeam: {
      id: Number(row.home_team_id),
      name: row.home_team_name,
      shortName: row.home_team_short_name,
      primaryColor: row.home_team_color,
      ticketUrl: row.home_team_ticket_url,
    },
    awayTeam: {
      id: Number(row.away_team_id),
      name: row.away_team_name,
      shortName: row.away_team_short_name,
      primaryColor: row.away_team_color,
      ticketUrl: row.away_team_ticket_url,
    },
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    lineupConfirmed:
      row.lineup_confirmed === null ? null : Boolean(row.lineup_confirmed),
    probablePitchers: {
      home: toStartingPitcher(row, 'home', gameDate),
      away: toStartingPitcher(row, 'away', gameDate),
    },
    lineups: {
      home: [],
      away: [],
    },
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

function toLineupPlayer(row: GameLineupRow, referenceDate: Date): GameLineupPlayer {
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.player_name,
    backNumber: row.player_back_number,
    age: calculatePlayerAge(row.player_birth_date, referenceDate),
    profileImageUrl: row.player_profile_image_url,
    battingOrder: row.batting_order,
    fieldPosition: row.field_position,
    battingAvg: toNumberOrNull(row.player_season_batting_avg),
    ops: toNumberOrNull(row.player_season_ops),
    war: toNumberOrNull(row.war),
    isStarter: Boolean(row.is_starter),
  };
}

function rosterPlayerLookupSql(column: string) {
  return `(
    SELECT pr.${column}
    FROM players pr
    WHERE pr.team_id = gl.team_id
      AND pr.name = p.name
      AND pr.kbo_player_id IS NOT NULL
      AND (
        p.kbo_player_id IS NULL
        OR pr.kbo_player_id = p.kbo_player_id
      )
    ORDER BY
      (pr.birth_date IS NOT NULL) DESC,
      (pr.season_batting_avg IS NOT NULL) DESC,
      (pr.season_ops IS NOT NULL) DESC,
      pr.id ASC
    LIMIT 1
  )`;
}

async function listGameLineups(gameId: number) {
  const [rows] = await db.query<GameLineupRow[]>(
    `SELECT
       gl.id,
       gl.team_id,
       gl.player_id,
       p.name AS player_name,
       COALESCE(p.back_number, ${rosterPlayerLookupSql('back_number')}) AS player_back_number,
       COALESCE(p.profile_image_url, ${rosterPlayerLookupSql('profile_image_url')}) AS player_profile_image_url,
       COALESCE(p.season_batting_avg, ${rosterPlayerLookupSql('season_batting_avg')}) AS player_season_batting_avg,
       COALESCE(p.season_ops, ${rosterPlayerLookupSql('season_ops')}) AS player_season_ops,
       COALESCE(p.birth_date, ${rosterPlayerLookupSql('birth_date')}) AS player_birth_date,
       gl.batting_order,
       gl.field_position,
       gl.war,
       gl.is_starter
     FROM game_lineups gl
     JOIN players p ON p.id = gl.player_id
     WHERE gl.game_id = ?
     ORDER BY gl.team_id ASC, gl.batting_order ASC`,
    [gameId],
  );

  return rows;
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

  if (!rows[0]) {
    return null;
  }

  const game = toGame(rows[0]);
  const lineupRows = await listGameLineups(game.id);
  const referenceDate = game.gameDate;

  game.lineups = {
    home: lineupRows
      .filter((row) => row.team_id === game.homeTeam.id)
      .map((row) => toLineupPlayer(row, referenceDate)),
    away: lineupRows
      .filter((row) => row.team_id === game.awayTeam.id)
      .map((row) => toLineupPlayer(row, referenceDate)),
  };

  return game;
}
