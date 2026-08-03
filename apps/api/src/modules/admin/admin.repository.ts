import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export async function getAdminSummary() {
  const [[users], [posts], [comments], [games], [reports], [photos]] =
    await Promise.all([
      db.query<(RowDataPacket & { count: number })[]>(
        'SELECT COUNT(*) AS count FROM users',
      ),
      db.query<(RowDataPacket & { count: number })[]>(
        'SELECT COUNT(*) AS count FROM posts',
      ),
      db.query<(RowDataPacket & { count: number })[]>(
        'SELECT COUNT(*) AS count FROM comments',
      ),
      db.query<(RowDataPacket & { count: number })[]>(
        `SELECT COUNT(*) AS count
         FROM games
         WHERE external_source = 'kbo'`,
      ),
      db.query<(RowDataPacket & { count: number })[]>(
        `SELECT COUNT(*) AS count FROM content_reports WHERE status = 'pending'`,
      ),
      db.query<(RowDataPacket & { count: number })[]>(
        'SELECT COUNT(*) AS count FROM attendance_records WHERE photo_url IS NOT NULL',
      ),
    ]);

  return {
    users: Number(users[0]?.count ?? 0),
    posts: Number(posts[0]?.count ?? 0),
    comments: Number(comments[0]?.count ?? 0),
    games: Number(games[0]?.count ?? 0),
    pendingReports: Number(reports[0]?.count ?? 0),
    photos: Number(photos[0]?.count ?? 0),
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
       u.email_verified_at AS emailVerifiedAt,
       u.created_at AS createdAt,
       COUNT(DISTINCT p.id) AS postCount,
       COUNT(DISTINCT c.id) AS commentCount
     FROM users u
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     LEFT JOIN posts p ON p.user_id = u.id
     LEFT JOIN comments c ON c.user_id = u.id
     WHERE (? IS NULL OR u.email LIKE ? OR u.nickname LIKE ?)
     GROUP BY u.id, u.email, u.nickname, u.role, u.profile_image_url, u.favorite_team_id, t.short_name, u.email_verified_at, u.created_at
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

export async function deleteAdminUser(userId: number) {
  await db.execute(
    `DELETE FROM users
     WHERE id = ?`,
    [userId],
  );
}

export async function listAdminUserUploadUrls(userId: number) {
  const [rows] = await db.query<(RowDataPacket & { assetUrl: string })[]>(
    `SELECT profile_image_url AS assetUrl
     FROM users
     WHERE id = ? AND profile_image_url IS NOT NULL
     UNION ALL
     SELECT photo_url AS assetUrl
     FROM attendance_records
     WHERE user_id = ? AND photo_url IS NOT NULL`,
    [userId, userId],
  );

  return rows.map((row) => row.assetUrl);
}

export async function clearAdminUserProfileImage(userId: number) {
  const [rows] = await db.query<
    (RowDataPacket & { profileImageUrl: string | null })[]
  >(
    `SELECT profile_image_url AS profileImageUrl
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );
  await db.execute(
    `UPDATE users
     SET profile_image_url = NULL
     WHERE id = ?`,
    [userId],
  );

  return rows[0]?.profileImageUrl ?? null;
}

export async function listAdminPosts(input: {
  keyword?: string;
  page: number;
  size: number;
  category?: string;
  isPinned?: boolean;
}) {
  const conditions: string[] = [];
  const params: Array<string | number | boolean> = [];

  if (input.keyword) {
    const q = `%${input.keyword}%`;
    conditions.push(
      '(p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ?)',
    );
    params.push(q, q, q);
  }

  if (input.category) {
    conditions.push('p.category = ?');
    params.push(input.category);
  }

  if (typeof input.isPinned === 'boolean') {
    conditions.push('p.is_pinned = ?');
    params.push(input.isPinned);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';
  const offset = (input.page - 1) * input.size;
  const [countResult, itemsResult] = await Promise.all([
    db.query<(RowDataPacket & { count: number })[]>(
      `SELECT COUNT(*) AS count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ${whereClause}`,
      params,
    ),
    db.query<RowDataPacket[]>(
      `SELECT
       p.id,
       p.category,
       p.title,
       p.content,
       p.is_pinned AS isPinned,
       p.request_status AS requestStatus,
       p.created_at AS createdAt,
       u.id AS authorId,
       u.nickname AS authorNickname,
       u.profile_image_url AS authorProfileImageUrl,
       COUNT(c.id) AS commentCount
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN comments c ON c.post_id = p.id
     ${whereClause}
     GROUP BY p.id, p.category, p.title, p.content, p.is_pinned, p.request_status, p.created_at, u.id, u.nickname, u.profile_image_url
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT ? OFFSET ?`,
      [...params, input.size, offset],
    ),
  ]);

  const [countRows] = countResult;
  const [items] = itemsResult;

  return {
    items: items.map((item) => ({
      ...item,
      isPinned: Boolean(item.isPinned),
    })),
    total: Number(countRows[0]?.count ?? 0),
  };
}

export async function listAdminAttendanceRecords(keyword?: string) {
  const q = keyword ? `%${keyword}%` : null;
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT
       ar.id,
       ar.photo_url AS photoUrl,
       ar.memo,
       ar.watch_type AS watchType,
       ar.created_at AS createdAt,
       u.id AS authorId,
       u.nickname AS authorNickname,
       u.profile_image_url AS authorProfileImageUrl,
       g.game_date AS gameDate,
       g.stadium,
       ht.short_name AS homeTeamShortName,
       at.short_name AS awayTeamShortName
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     JOIN games g ON g.id = ar.game_id
     JOIN teams ht ON ht.id = g.home_team_id
     JOIN teams at ON at.id = g.away_team_id
     WHERE (
       ? IS NULL OR
       u.nickname LIKE ? OR
       ar.memo LIKE ? OR
       g.stadium LIKE ?
     )
     ORDER BY ar.created_at DESC
     LIMIT 200`,
    [q, q, q, q],
  );

  return rows;
}

export async function clearAdminAttendancePhoto(recordId: number) {
  const [rows] = await db.query<
    (RowDataPacket & { photoUrl: string | null })[]
  >(
    `SELECT photo_url AS photoUrl
     FROM attendance_records
     WHERE id = ?
     LIMIT 1`,
    [recordId],
  );
  await db.execute(
    `UPDATE attendance_records
     SET photo_url = NULL
     WHERE id = ?`,
    [recordId],
  );

  return rows[0]?.photoUrl ?? null;
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

export async function listAdminGames(input: {
  page: number;
  size: number;
  status?: string;
}) {
  const whereClause = input.status ? 'WHERE g.status = ?' : '';
  const params = input.status ? [input.status] : [];
  const offset = (input.page - 1) * input.size;
  const [countResult, itemsResult] = await Promise.all([
    db.query<(RowDataPacket & { count: number })[]>(
      `SELECT COUNT(*) AS count
       FROM games g
       ${whereClause}`,
      params,
    ),
    db.query<RowDataPacket[]>(
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
     ${whereClause}
     ORDER BY g.game_date DESC
     LIMIT ? OFFSET ?`,
      [...params, input.size, offset],
    ),
  ]);

  const [countRows] = countResult;
  const [items] = itemsResult;

  return {
    items,
    total: Number(countRows[0]?.count ?? 0),
  };
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

export async function createAdminGame(
  input: Omit<Parameters<typeof updateAdminGame>[0], 'id'>,
) {
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
