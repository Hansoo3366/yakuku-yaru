import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export async function getAdminSummary() {
  const [[users], [posts], [comments], [games]] = await Promise.all([
    db.query<(RowDataPacket & { count: number })[]>('SELECT COUNT(*) AS count FROM users'),
    db.query<(RowDataPacket & { count: number })[]>('SELECT COUNT(*) AS count FROM posts'),
    db.query<(RowDataPacket & { count: number })[]>('SELECT COUNT(*) AS count FROM comments'),
    db.query<(RowDataPacket & { count: number })[]>('SELECT COUNT(*) AS count FROM games'),
  ]);

  return {
    users: Number(users[0]?.count ?? 0),
    posts: Number(posts[0]?.count ?? 0),
    comments: Number(comments[0]?.count ?? 0),
    games: Number(games[0]?.count ?? 0),
  };
}

export async function listAdminUsers(keyword?: string) {
  const q = keyword ? `%${keyword}%` : null;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       u.id,
       u.email,
       u.nickname,
       u.role,
       u.profile_image_url AS profileImageUrl,
       u.favorite_team_id AS favoriteTeamId,
       t.short_name AS favoriteTeamShortName,
       u.created_at AS createdAt,
       COUNT(DISTINCT p.id) AS postCount,
       COUNT(DISTINCT c.id) AS commentCount
     FROM users u
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     LEFT JOIN posts p ON p.user_id = u.id
     LEFT JOIN comments c ON c.user_id = u.id
     WHERE (? IS NULL OR u.email LIKE ? OR u.nickname LIKE ?)
     GROUP BY u.id, u.email, u.nickname, u.role, u.profile_image_url, u.favorite_team_id, t.short_name, u.created_at
     ORDER BY u.created_at DESC
     LIMIT 100`,
    [q, q, q],
  );

  return rows;
}

export async function updateUserRole(userId: number, role: string) {
  await db.execute(
    `UPDATE users
     SET role = ?
     WHERE id = ?`,
    [role, userId],
  );
}

export async function listAdminPosts(keyword?: string) {
  const q = keyword ? `%${keyword}%` : null;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       p.id,
       p.title,
       p.created_at AS createdAt,
       u.id AS authorId,
       u.nickname AS authorNickname,
       COUNT(c.id) AS commentCount
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE (? IS NULL OR p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ?)
     GROUP BY p.id, p.title, p.created_at, u.id, u.nickname
     ORDER BY p.created_at DESC
     LIMIT 100`,
    [q, q, q, q],
  );

  return rows;
}

export async function listAdminComments(keyword?: string) {
  const q = keyword ? `%${keyword}%` : null;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       c.id,
       c.post_id AS postId,
       c.content,
       c.created_at AS createdAt,
       p.title AS postTitle,
       u.id AS authorId,
       u.nickname AS authorNickname
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     JOIN users u ON u.id = c.user_id
     WHERE (? IS NULL OR c.content LIKE ? OR p.title LIKE ? OR u.nickname LIKE ?)
     ORDER BY c.created_at DESC
     LIMIT 100`,
    [q, q, q, q],
  );

  return rows;
}

export async function listAdminGames() {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       g.id,
       g.game_date AS gameDate,
       g.stadium,
       g.home_team_id AS homeTeamId,
       ht.short_name AS homeTeamShortName,
       g.away_team_id AS awayTeamId,
       at.short_name AS awayTeamShortName,
       g.home_score AS homeScore,
       g.away_score AS awayScore,
       g.status,
       g.ticket_url AS ticketUrl,
       g.ticket_open_at AS ticketOpenAt
     FROM games g
     JOIN teams ht ON ht.id = g.home_team_id
     JOIN teams at ON at.id = g.away_team_id
     ORDER BY g.game_date DESC
     LIMIT 100`,
  );

  return rows;
}

export async function updateAdminGame(input: {
  id: number;
  gameDate: string;
  stadium: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  ticketUrl: string | null;
  ticketOpenAt: string | null;
}) {
  await db.execute(
    `UPDATE games
     SET game_date = ?,
         stadium = ?,
         home_team_id = ?,
         away_team_id = ?,
         home_score = ?,
         away_score = ?,
         status = ?,
         ticket_url = ?,
         ticket_open_at = ?
     WHERE id = ?`,
    [
      input.gameDate,
      input.stadium,
      input.homeTeamId,
      input.awayTeamId,
      input.homeScore,
      input.awayScore,
      input.status,
      input.ticketUrl,
      input.ticketOpenAt,
      input.id,
    ],
  );
}

export async function createAdminGame(input: Omit<Parameters<typeof updateAdminGame>[0], 'id'>) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO games (
       game_date,
       stadium,
       home_team_id,
       away_team_id,
       home_score,
       away_score,
       status,
       ticket_url,
       ticket_open_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.gameDate,
      input.stadium,
      input.homeTeamId,
      input.awayTeamId,
      input.homeScore,
      input.awayScore,
      input.status,
      input.ticketUrl,
      input.ticketOpenAt,
    ],
  );

  return result.insertId;
}
