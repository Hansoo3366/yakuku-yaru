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
  youtubeUrl: string | null;
  lyrics: string | null;
  cheerUpdatedAt: Date | null;
};

export type PlayerCheerInput = {
  playerId: number;
  title: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
};

export type PlayerCheerListInput = {
  keyword?: string;
  teamId?: number;
  onlyWithCheer?: boolean;
  page?: number;
  rosterScope?: 'firstTeam' | 'all';
  size?: number;
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
      pc.youtube_url AS youtubeUrl,
      pc.lyrics,
      pc.updated_at AS cheerUpdatedAt
    FROM players p
    JOIN teams t ON t.id = p.team_id
    LEFT JOIN player_cheers pc ON pc.player_id = p.id`;
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

  if ((input.rosterScope ?? 'firstTeam') === 'firstTeam') {
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

export async function listPlayerCheers(input: PlayerCheerListInput) {
  const page = Math.max(1, input.page ?? 1);
  const size = Math.min(100, Math.max(1, input.size ?? 24));
  const offset = (page - 1) * size;
  const { filters, params } = buildPlayerCheerFilters(input);
  const whereSql = filters.join(' AND ');

  const [countRows] = await db.query<Array<RowDataPacket & { total: number }>>(
    `SELECT COUNT(*) AS total
     FROM players p
     JOIN teams t ON t.id = p.team_id
     LEFT JOIN player_cheers pc ON pc.player_id = p.id
     WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const [rows] = await db.query<PlayerCheerRow[]>(
    `${playerCheerSelectSql()}
     WHERE ${whereSql}
     ORDER BY
       t.id ASC,
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

export async function upsertPlayerCheer(input: PlayerCheerInput) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO player_cheers (
       player_id,
       title,
       youtube_url,
       lyrics
     )
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       title = VALUES(title),
       youtube_url = VALUES(youtube_url),
       lyrics = VALUES(lyrics)`,
    [input.playerId, input.title, input.youtubeUrl, input.lyrics],
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
