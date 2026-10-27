import type { RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import type { BoxScore } from './parse-box-score.js';

type BoxScoreRow = RowDataPacket & {
  payload: BoxScore | string;
};

type BoxScoreTargetRow = RowDataPacket & {
  id: number;
  external_id: string;
  kbo_series_id: string;
  season_year: number;
};

export type BoxScoreTarget = {
  gameId: number;
  kboGameId: string;
  seriesId: string;
  seasonYear: number;
};

export async function findGameBoxScore(gameId: number) {
  const [rows] = await db.query<BoxScoreRow[]>(
    `SELECT payload
     FROM game_box_scores
     WHERE game_id = ?
     LIMIT 1`,
    [gameId],
  );
  const payload = rows[0]?.payload;

  if (!payload) {
    return null;
  }

  return typeof payload === 'string' ? (JSON.parse(payload) as BoxScore) : payload;
}

export async function saveGameBoxScore(gameId: number, boxScore: BoxScore) {
  await db.execute(
    `INSERT INTO game_box_scores (game_id, payload, synced_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), synced_at = VALUES(synced_at)`,
    [gameId, JSON.stringify(boxScore)],
  );
}

/**
 * 기간 안에서 끝났는데 박스스코어가 없는 KBO 경기. 최근 경기부터 채운다.
 * from·to 는 KST 벽시계 문자열(YYYY-MM-DD HH:mm:ss)이다.
 */
export async function listGamesMissingBoxScore(input: {
  from: string;
  to: string;
  limit: number;
}): Promise<BoxScoreTarget[]> {
  const [rows] = await db.query<BoxScoreTargetRow[]>(
    `SELECT g.id, g.external_id, g.kbo_series_id, YEAR(g.game_date) AS season_year
     FROM games g
     LEFT JOIN game_box_scores b ON b.game_id = g.id
     WHERE g.external_source = 'kbo'
       AND g.status = 'finished'
       AND g.external_id NOT LIKE 'pending-%'
       AND g.game_date >= ?
       AND g.game_date < ?
       AND b.game_id IS NULL
     ORDER BY g.game_date DESC
     LIMIT ?`,
    [input.from, input.to, input.limit],
  );

  return rows.map((row) => ({
    gameId: row.id,
    kboGameId: row.external_id,
    seriesId: row.kbo_series_id,
    seasonYear: Number(row.season_year),
  }));
}
