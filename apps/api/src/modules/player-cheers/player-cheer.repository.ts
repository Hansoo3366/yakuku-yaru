import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type PlayerCheerRow = RowDataPacket & {
  playerId: number;
  kboPlayerId: string | null;
  name: string;
  backNumber: string | null;
  position: string | null;
  profileImageUrl: string | null;
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  cheerId: number | null;
  cheerTitle: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
  cheerUpdatedAt: Date | null;
  recentGameDate: Date | null;
  recentBattingOrder: number | null;
  recentLineupRole: string | null;
};

export type TeamCheerRow = RowDataPacket & {
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  cheerId: number | null;
  cheerTitle: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
  cheerUpdatedAt: Date | null;
};

export type PlayerCheerInput = {
  playerId: number;
  title: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
};

export type TeamCheerInput = {
  teamId: number;
  title: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
};

export type PlayerCheerListInput = {
  keyword?: string;
  teamId?: number;
  onlyWithCheer?: boolean;
  page?: number;
  rosterScope?: 'firstTeam' | 'all' | 'recentLineup';
  size?: number;
};

export type PlayerCheerTeamStatRow = RowDataPacket & {
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  totalPlayers: number;
  registeredPlayers: number;
};

function playerCheerSelectSql() {
  return `SELECT
      p.id AS playerId,
      p.kbo_player_id AS kboPlayerId,
      p.name,
      p.back_number AS backNumber,
      p.position,
      p.profile_image_url AS profileImageUrl,
      t.id AS teamId,
      t.name AS teamName,
      t.short_name AS teamShortName,
      t.primary_color AS teamPrimaryColor,
      pc.id AS cheerId,
      pc.title AS cheerTitle,
      pc.youtube_id AS youtubeId,
      pc.youtube_url AS youtubeUrl,
      pc.lyrics,
      pc.updated_at AS cheerUpdatedAt,
      rl.recentGameDate,
      rl.battingOrder AS recentBattingOrder,
      rl.lineupRole AS recentLineupRole
    FROM players p
    JOIN teams t ON t.id = p.team_id
    LEFT JOIN player_cheers pc ON pc.player_id = p.id
    LEFT JOIN (
      SELECT
        recent.team_id,
        recent.player_id,
        recent.game_date AS recentGameDate,
        MIN(recent.batting_order) AS battingOrder,
        CASE
          WHEN MAX(recent.is_pitcher) = 1 AND MIN(recent.batting_order) IS NULL THEN 'pitcher'
          WHEN MAX(recent.is_pitcher) = 1 THEN 'pitcher-lineup'
          ELSE 'lineup'
        END AS lineupRole
      FROM (
        SELECT
          gl.team_id,
          gl.player_id,
          g.game_date,
          gl.batting_order,
          0 AS is_pitcher
        FROM game_lineups gl
        JOIN games g ON g.id = gl.game_id
        JOIN (
          SELECT gl2.team_id, MAX(g2.game_date) AS game_date
          FROM game_lineups gl2
          JOIN games g2 ON g2.id = gl2.game_id
          WHERE YEAR(g2.game_date) = YEAR(CURDATE())
          GROUP BY gl2.team_id
        ) latest_lineup
          ON latest_lineup.team_id = gl.team_id
         AND latest_lineup.game_date = g.game_date
        UNION ALL
        SELECT
          gsp.team_id,
          gsp.player_id,
          g.game_date,
          NULL AS batting_order,
          1 AS is_pitcher
        FROM game_starting_pitchers gsp
        JOIN games g ON g.id = gsp.game_id
        JOIN (
          SELECT gsp2.team_id, MAX(g2.game_date) AS game_date
          FROM game_starting_pitchers gsp2
          JOIN games g2 ON g2.id = gsp2.game_id
          WHERE YEAR(g2.game_date) = YEAR(CURDATE())
          GROUP BY gsp2.team_id
        ) latest_pitcher
          ON latest_pitcher.team_id = gsp.team_id
         AND latest_pitcher.game_date = g.game_date
      ) recent
      GROUP BY recent.team_id, recent.player_id, recent.game_date
    ) rl ON rl.player_id = p.id AND rl.team_id = p.team_id`;
}

function recentLineupJoinSql() {
  return `LEFT JOIN (
      SELECT
        recent.team_id,
        recent.player_id,
        recent.game_date AS recentGameDate,
        MIN(recent.batting_order) AS battingOrder,
        CASE
          WHEN MAX(recent.is_pitcher) = 1 AND MIN(recent.batting_order) IS NULL THEN 'pitcher'
          WHEN MAX(recent.is_pitcher) = 1 THEN 'pitcher-lineup'
          ELSE 'lineup'
        END AS lineupRole
      FROM (
        SELECT
          gl.team_id,
          gl.player_id,
          g.game_date,
          gl.batting_order,
          0 AS is_pitcher
        FROM game_lineups gl
        JOIN games g ON g.id = gl.game_id
        JOIN (
          SELECT gl2.team_id, MAX(g2.game_date) AS game_date
          FROM game_lineups gl2
          JOIN games g2 ON g2.id = gl2.game_id
          WHERE YEAR(g2.game_date) = YEAR(CURDATE())
          GROUP BY gl2.team_id
        ) latest_lineup
          ON latest_lineup.team_id = gl.team_id
         AND latest_lineup.game_date = g.game_date
        UNION ALL
        SELECT
          gsp.team_id,
          gsp.player_id,
          g.game_date,
          NULL AS batting_order,
          1 AS is_pitcher
        FROM game_starting_pitchers gsp
        JOIN games g ON g.id = gsp.game_id
        JOIN (
          SELECT gsp2.team_id, MAX(g2.game_date) AS game_date
          FROM game_starting_pitchers gsp2
          JOIN games g2 ON g2.id = gsp2.game_id
          WHERE YEAR(g2.game_date) = YEAR(CURDATE())
          GROUP BY gsp2.team_id
        ) latest_pitcher
          ON latest_pitcher.team_id = gsp.team_id
         AND latest_pitcher.game_date = g.game_date
      ) recent
      GROUP BY recent.team_id, recent.player_id, recent.game_date
    ) rl ON rl.player_id = p.id AND rl.team_id = p.team_id`;
}

function playerCheerCountFromSql() {
  return `FROM players p
    JOIN teams t ON t.id = p.team_id
    LEFT JOIN player_cheers pc ON pc.player_id = p.id
    ${recentLineupJoinSql()}`;
}

function normalizeKeyword(keyword?: string) {
  return keyword?.trim() ? `%${keyword.trim()}%` : null;
}

function buildPlayerCheerFilters(input: PlayerCheerListInput) {
  const keyword = normalizeKeyword(input.keyword);
  const params: Array<number | string | null> = [keyword, keyword, keyword];
  const filters = [
    `(? IS NULL OR p.name LIKE ? OR t.short_name LIKE ?)`,
  ];

  if (input.teamId) {
    filters.push('p.team_id = ?');
    params.push(input.teamId);
  }

  if (input.onlyWithCheer) {
    filters.push('pc.id IS NOT NULL');
  }

  const rosterScope = input.rosterScope ?? 'firstTeam';

  if (rosterScope === 'recentLineup') {
    filters.push('rl.player_id IS NOT NULL');
  }

  if (rosterScope === 'firstTeam') {
    filters.push(`(
      pc.id IS NOT NULL
      OR EXISTS (
        SELECT 1
        FROM game_lineups gl
        JOIN games g ON g.id = gl.game_id
        WHERE gl.player_id = p.id
          AND YEAR(g.game_date) = YEAR(CURDATE())
        LIMIT 1
      )
      OR EXISTS (
        SELECT 1
        FROM game_starting_pitchers gsp
        JOIN games g ON g.id = gsp.game_id
        WHERE gsp.player_id = p.id
          AND YEAR(g.game_date) = YEAR(CURDATE())
        LIMIT 1
      )
    )`);
  }

  return {
    filters,
    params,
  };
}

async function listPlayerCheerTeamStats(input: PlayerCheerListInput) {
  const { filters, params } = buildPlayerCheerFilters({
    rosterScope: input.rosterScope,
    onlyWithCheer: input.onlyWithCheer,
  });
  const whereSql = filters.join(' AND ');

  const [rows] = await db.query<PlayerCheerTeamStatRow[]>(
    `SELECT
       t.id AS teamId,
       t.name AS teamName,
       t.short_name AS teamShortName,
       t.primary_color AS teamPrimaryColor,
       COUNT(*) AS totalPlayers,
       SUM(CASE WHEN pc.id IS NULL THEN 0 ELSE 1 END) AS registeredPlayers
     FROM players p
     JOIN teams t ON t.id = p.team_id
     LEFT JOIN player_cheers pc ON pc.player_id = p.id
     ${recentLineupJoinSql()}
     WHERE ${whereSql}
     GROUP BY t.id, t.name, t.short_name, t.primary_color
     ORDER BY t.id ASC`,
    params,
  );

  return rows.map((row) => ({
    teamId: Number(row.teamId),
    teamName: row.teamName,
    teamShortName: row.teamShortName,
    teamPrimaryColor: row.teamPrimaryColor,
    totalPlayers: Number(row.totalPlayers),
    registeredPlayers: Number(row.registeredPlayers),
  }));
}

export async function listPlayerCheers(input: PlayerCheerListInput) {
  const page = Math.max(1, input.page ?? 1);
  const size = Math.min(100, Math.max(1, input.size ?? 24));
  const offset = (page - 1) * size;
  const { filters, params } = buildPlayerCheerFilters(input);
  const whereSql = filters.join(' AND ');

  const [countRows] = await db.query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total
     ${playerCheerCountFromSql()}
     WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await db.query<PlayerCheerRow[]>(
    `${playerCheerSelectSql()}
     WHERE ${whereSql}
     ORDER BY
       t.id ASC,
       CASE WHEN rl.battingOrder IS NULL THEN 1 ELSE 0 END ASC,
       rl.battingOrder ASC,
       CASE WHEN rl.lineupRole LIKE 'pitcher%' THEN 0 ELSE 1 END ASC,
       p.position ASC,
       CAST(NULLIF(p.back_number, '') AS UNSIGNED) ASC,
       p.name ASC
     LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );

  return {
    items: rows,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    },
    stats: {
      teams: await listPlayerCheerTeamStats(input),
    },
  };
}

export async function findPlayerCheerByPlayerId(playerId: number) {
  const [rows] = await db.query<PlayerCheerRow[]>(
    `${playerCheerSelectSql()}
     WHERE p.id = ?
     LIMIT 1`,
    [playerId],
  );

  return rows[0] ?? null;
}

function teamCheerSelectSql() {
  return `SELECT
      t.id AS teamId,
      t.name AS teamName,
      t.short_name AS teamShortName,
      t.primary_color AS teamPrimaryColor,
      tc.id AS cheerId,
      tc.title AS cheerTitle,
      tc.youtube_id AS youtubeId,
      tc.youtube_url AS youtubeUrl,
      tc.lyrics,
      tc.updated_at AS cheerUpdatedAt
    FROM teams t
    LEFT JOIN team_cheers tc ON tc.team_id = t.id`;
}

export async function listTeamCheers() {
  const [rows] = await db.query<TeamCheerRow[]>(
    `${teamCheerSelectSql()}
     ORDER BY t.id ASC`,
  );

  return rows;
}

export async function findTeamCheerByTeamId(teamId: number) {
  const [rows] = await db.query<TeamCheerRow[]>(
    `${teamCheerSelectSql()}
     WHERE t.id = ?
     LIMIT 1`,
    [teamId],
  );

  return rows[0] ?? null;
}

export async function upsertPlayerCheer(input: PlayerCheerInput) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO player_cheers (
       player_id,
       title,
       youtube_id,
       youtube_url,
       lyrics
     )
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       title = VALUES(title),
       youtube_id = VALUES(youtube_id),
       youtube_url = VALUES(youtube_url),
       lyrics = VALUES(lyrics)`,
    [input.playerId, input.title, input.youtubeId, input.youtubeUrl, input.lyrics],
  );

  return Number(result.insertId);
}

export async function upsertTeamCheer(input: TeamCheerInput) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO team_cheers (
       team_id,
       title,
       youtube_id,
       youtube_url,
       lyrics
     )
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       title = VALUES(title),
       youtube_id = VALUES(youtube_id),
       youtube_url = VALUES(youtube_url),
       lyrics = VALUES(lyrics)`,
    [input.teamId, input.title, input.youtubeId, input.youtubeUrl, input.lyrics],
  );

  return Number(result.insertId);
}

export async function deletePlayerCheer(playerId: number) {
  await db.execute(
    `DELETE FROM player_cheers
     WHERE player_id = ?`,
    [playerId],
  );
}

export async function deleteTeamCheer(teamId: number) {
  await db.execute(
    `DELETE FROM team_cheers
     WHERE team_id = ?`,
    [teamId],
  );
}
