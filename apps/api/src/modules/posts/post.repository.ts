import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type PostRow = RowDataPacket & {
  id: number;
  user_id: number;
  title: string;
  content: string;
  author_nickname: string;
  created_at: Date;
  updated_at: Date;
};

export type PostListItem = {
  id: number;
  userId: number;
  title: string;
  authorNickname: string;
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
    title: row.title,
    authorNickname: row.author_nickname,
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
  title: string;
  content: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO posts (user_id, title, content)
     VALUES (?, ?, ?)`,
    [input.userId, input.title, input.content],
  );

  return findPostById(result.insertId);
}

export async function listPosts(input: {
  page: number;
  size: number;
  keyword?: string;
}) {
  const offset = (input.page - 1) * input.size;
  const keyword = input.keyword ? `%${input.keyword}%` : null;
  const whereClause = keyword ? 'WHERE p.title LIKE ? OR p.content LIKE ?' : '';
  const whereParams = keyword ? [keyword, keyword] : [];

  const [rows] = await db.query<PostRow[]>(
    `SELECT p.id, p.user_id, p.title, p.content, u.nickname AS author_nickname, p.created_at, p.updated_at
     FROM posts p
     JOIN users u ON u.id = p.user_id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, input.size, offset],
  );

  const [countRows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total
     FROM posts p
     ${whereClause}`,
    whereParams,
  );

  return {
    items: rows.map(toPostListItem),
    total: countRows[0]?.total ?? 0,
  };
}

export async function findPostById(id: number) {
  const [rows] = await db.query<PostRow[]>(
    `SELECT p.id, p.user_id, p.title, p.content, u.nickname AS author_nickname, p.created_at, p.updated_at
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function updatePost(input: {
  id: number;
  title: string;
  content: string;
}) {
  await db.execute(
    `UPDATE posts
     SET title = ?, content = ?
     WHERE id = ?`,
    [input.title, input.content, input.id],
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
