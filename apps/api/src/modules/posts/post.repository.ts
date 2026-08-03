import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type PostRow = RowDataPacket & {
  id: number;
  user_id: number;
  category: string;
  title: string;
  content: string;
  is_pinned: number;
  request_status: string | null;
  author_nickname: string;
  author_role: string;
  author_profile_image_url: string | null;
  author_favorite_team_short_name: string | null;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
};

export type PostListItem = {
  id: number;
  userId: number;
  category: string;
  title: string;
  isPinned: boolean;
  requestStatus: string | null;
  authorNickname: string;
  authorRole: string;
  authorProfileImageUrl: string | null;
  authorFavoriteTeamShortName: string | null;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PostDetail = PostListItem & {
  content: string;
};

export function toPostListItem(row: PostRow): PostListItem {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    isPinned: Boolean(row.is_pinned),
    requestStatus: row.request_status,
    authorNickname: row.author_nickname,
    authorRole: row.author_role,
    authorProfileImageUrl: row.author_profile_image_url,
    authorFavoriteTeamShortName: row.author_favorite_team_short_name,
    commentCount: Number(row.comment_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPostDetail(row: PostRow): PostDetail {
  return {
    ...toPostListItem(row),
    content: row.content,
  };
}

export async function createPost(input: {
  userId: number;
  category: string;
  title: string;
  content: string;
  isPinned: boolean;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO posts (
       user_id,
       category,
       title,
       content,
       is_pinned,
       request_status
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.category,
      input.title,
      input.content,
      input.isPinned,
      input.category === 'feature' ? 'received' : null,
    ],
  );

  return findPostById(result.insertId);
}

export async function listPosts(input: {
  page: number;
  size: number;
  keyword?: string;
  category?: string;
  scope?: 'latest' | 'myTeam' | 'following';
  viewerUserId?: number | null;
}) {
  const offset = (input.page - 1) * input.size;
  const keyword = input.keyword ? `%${input.keyword}%` : null;
  const conditions: string[] = [];
  const whereParams: Array<string | number> = [];

  if (keyword) {
    conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
    whereParams.push(keyword, keyword);
  }

  if (input.category) {
    conditions.push('p.category = ?');
    whereParams.push(input.category);
  }

  if (input.scope === 'myTeam') {
    if (input.viewerUserId) {
      conditions.push(
        `u.favorite_team_id = (
          SELECT favorite_team_id FROM users WHERE id = ?
        )`,
      );
      whereParams.push(input.viewerUserId);
    } else {
      conditions.push('1 = 0');
    }
  }

  if (input.scope === 'following') {
    if (input.viewerUserId) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM user_follows uf
          WHERE uf.follower_user_id = ?
            AND uf.followed_user_id = p.user_id
        )`,
      );
      whereParams.push(input.viewerUserId);
    } else {
      conditions.push('1 = 0');
    }
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const [rows] = await db.query<PostRow[]>(
    `SELECT
       p.id,
       p.user_id,
       p.category,
       p.title,
       p.content,
       p.is_pinned,
       p.request_status,
       u.nickname AS author_nickname,
       u.role AS author_role,
       u.profile_image_url AS author_profile_image_url,
       t.short_name AS author_favorite_team_short_name,
       COUNT(c.id) AS comment_count,
       p.created_at,
       p.updated_at
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     LEFT JOIN comments c ON c.post_id = p.id
     ${whereClause}
     GROUP BY p.id, p.user_id, p.category, p.title, p.content, p.is_pinned, p.request_status, u.nickname, u.role, u.profile_image_url, t.short_name, p.created_at, p.updated_at
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, input.size, offset],
  );

  const [countRows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ${whereClause}`,
    whereParams,
  );

  return {
    items: rows.map(toPostListItem),
    total: countRows[0]?.total ?? 0,
  };
}

export async function listRecentPostsByUser(userId: number, limit = 5) {
  const [rows] = await db.query<PostRow[]>(
    `SELECT
       p.id,
       p.user_id,
       p.category,
       p.title,
       p.content,
       p.is_pinned,
       p.request_status,
       u.nickname AS author_nickname,
       u.role AS author_role,
       u.profile_image_url AS author_profile_image_url,
       t.short_name AS author_favorite_team_short_name,
       COUNT(c.id) AS comment_count,
       p.created_at,
       p.updated_at
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE p.user_id = ?
     GROUP BY p.id, p.user_id, p.category, p.title, p.content, p.is_pinned, p.request_status, u.nickname, u.role, u.profile_image_url, t.short_name, p.created_at, p.updated_at
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT ?`,
    [userId, limit],
  );

  return rows.map(toPostListItem);
}

export async function findPostById(id: number) {
  const [rows] = await db.query<PostRow[]>(
    `SELECT
       p.id,
       p.user_id,
       p.category,
       p.title,
       p.content,
       p.is_pinned,
       p.request_status,
       u.nickname AS author_nickname,
       u.role AS author_role,
       u.profile_image_url AS author_profile_image_url,
       t.short_name AS author_favorite_team_short_name,
       COUNT(c.id) AS comment_count,
       p.created_at,
       p.updated_at
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE p.id = ?
     GROUP BY p.id, p.user_id, p.category, p.title, p.content, p.is_pinned, p.request_status, u.nickname, u.role, u.profile_image_url, t.short_name, p.created_at, p.updated_at
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function updatePost(input: {
  id: number;
  category: string;
  title: string;
  content: string;
  isPinned: boolean;
}) {
  await db.execute(
    `UPDATE posts
     SET category = ?,
         title = ?,
         content = ?,
         is_pinned = ?,
         request_status = CASE
           WHEN ? = 'feature' THEN COALESCE(request_status, 'received')
           ELSE NULL
         END
     WHERE id = ?`,
    [
      input.category,
      input.title,
      input.content,
      input.isPinned,
      input.category,
      input.id,
    ],
  );

  return findPostById(input.id);
}

export async function updatePostModeration(input: {
  id: number;
  category: string;
  isPinned: boolean;
  requestStatus: string | null;
}) {
  await db.execute(
    `UPDATE posts
     SET category = ?,
         is_pinned = ?,
         request_status = ?
     WHERE id = ?`,
    [input.category, input.isPinned, input.requestStatus, input.id],
  );

  return findPostById(input.id);
}

export async function deletePost(id: number) {
  await db.execute(
    `DELETE FROM posts
     WHERE id = ?`,
    [id],
  );
}
