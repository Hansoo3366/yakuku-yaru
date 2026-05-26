import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

export type CommentRow = RowDataPacket & {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  author_nickname: string;
  author_profile_image_url: string | null;
  author_favorite_team_short_name: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CommentItem = {
  id: number;
  postId: number;
  userId: number;
  content: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  authorFavoriteTeamShortName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toCommentItem(row: CommentRow): CommentItem {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    authorNickname: row.author_nickname,
    authorProfileImageUrl: row.author_profile_image_url,
    authorFavoriteTeamShortName: row.author_favorite_team_short_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createComment(input: {
  postId: number;
  userId: number;
  content: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO comments (post_id, user_id, content)
     VALUES (?, ?, ?)`,
    [input.postId, input.userId, input.content],
  );

  return findCommentById(result.insertId);
}

export async function listCommentsByPostId(postId: number) {
  const [rows] = await db.query<CommentRow[]>(
    `SELECT
       c.id,
       c.post_id,
       c.user_id,
       c.content,
       u.nickname AS author_nickname,
       u.profile_image_url AS author_profile_image_url,
       t.short_name AS author_favorite_team_short_name,
       c.created_at,
       c.updated_at
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId],
  );

  return rows.map(toCommentItem);
}

export async function findCommentById(id: number) {
  const [rows] = await db.query<CommentRow[]>(
    `SELECT
       c.id,
       c.post_id,
       c.user_id,
       c.content,
       u.nickname AS author_nickname,
       u.profile_image_url AS author_profile_image_url,
       t.short_name AS author_favorite_team_short_name,
       c.created_at,
       c.updated_at
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function deleteComment(id: number) {
  await db.execute(
    `DELETE FROM comments
     WHERE id = ?`,
    [id],
  );
}
