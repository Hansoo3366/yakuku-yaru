import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';
import { validateStadiumNoteField } from '../../utils/user-input.js';

const MAX_STADIUM_LENGTH = 100;

export type UserStadiumNoteRow = RowDataPacket & {
  id: number;
  user_id: number;
  stadium: string;
  food_memo: string;
  parking_memo: string;
  is_public: number | boolean;
  created_at: Date;
  updated_at: Date;
};

export type UserStadiumNote = {
  stadium: string;
  foodMemo: string;
  parkingMemo: string;
  isPublic: boolean;
  updatedAt: string;
};

export function normalizeStadiumName(stadium: string) {
  const trimmed = stadium.trim();

  if (!trimmed || trimmed.length > MAX_STADIUM_LENGTH) {
    return null;
  }

  return trimmed;
}

export function normalizeStadiumNoteFields(input: {
  foodMemo?: string;
  parkingMemo?: string;
}) {
  const foodMemo =
    typeof input.foodMemo === 'string'
      ? validateStadiumNoteField(input.foodMemo)
      : '';
  const parkingMemo =
    typeof input.parkingMemo === 'string'
      ? validateStadiumNoteField(input.parkingMemo)
      : '';

  return { foodMemo, parkingMemo };
}

function toUserStadiumNote(row: UserStadiumNoteRow): UserStadiumNote {
  return {
    stadium: row.stadium,
    foodMemo: row.food_memo,
    parkingMemo: row.parking_memo,
    isPublic: Boolean(row.is_public),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findUserStadiumNote(input: {
  userId: number;
  stadium: string;
}) {
  const [rows] = await db.query<UserStadiumNoteRow[]>(
    `SELECT id, user_id, stadium, food_memo, parking_memo, is_public, created_at, updated_at
     FROM user_stadium_notes
     WHERE user_id = ?
       AND stadium = ?
     LIMIT 1`,
    [input.userId, input.stadium],
  );

  return rows[0] ? toUserStadiumNote(rows[0]) : null;
}

export async function upsertUserStadiumNote(input: {
  userId: number;
  stadium: string;
  foodMemo: string;
  parkingMemo: string;
  isPublic: boolean;
}) {
  await db.execute<ResultSetHeader>(
    `INSERT INTO user_stadium_notes (user_id, stadium, food_memo, parking_memo, is_public)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       food_memo = VALUES(food_memo),
       parking_memo = VALUES(parking_memo),
       is_public = VALUES(is_public),
       updated_at = CURRENT_TIMESTAMP`,
    [
      input.userId,
      input.stadium,
      input.foodMemo,
      input.parkingMemo,
      input.isPublic,
    ],
  );

  return findUserStadiumNote({
    userId: input.userId,
    stadium: input.stadium,
  });
}

export async function deleteUserStadiumNote(input: {
  userId: number;
  stadium: string;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM user_stadium_notes
     WHERE user_id = ?
       AND stadium = ?`,
    [input.userId, input.stadium],
  );

  return result.affectedRows > 0;
}

const MAX_PUBLIC_NOTES = 300;

type StadiumSummaryRow = RowDataPacket & {
  stadium: string;
  food_summary: string | null;
  parking_summary: string | null;
  map_url: string | null;
  public_note_count: number;
  last_note_at: Date | null;
};

type PublicStadiumNoteRow = RowDataPacket & {
  id: number;
  user_id: number;
  food_memo: string;
  parking_memo: string;
  updated_at: Date;
  author_nickname: string;
  author_role: string;
  author_profile_image_url: string | null;
  author_favorite_team_short_name: string | null;
};

export type StadiumSummary = {
  stadium: string;
  foodSummary: string | null;
  parkingSummary: string | null;
  mapUrl: string | null;
  publicNoteCount: number;
  lastNoteAt: string | null;
};

export type PublicStadiumNote = {
  id: number;
  foodMemo: string;
  parkingMemo: string;
  updatedAt: string;
  author: {
    id: number;
    nickname: string;
    role: string;
    profileImageUrl: string | null;
    favoriteTeamShortName: string | null;
  };
};

function toStadiumSummary(row: StadiumSummaryRow): StadiumSummary {
  return {
    stadium: row.stadium,
    foodSummary: row.food_summary,
    parkingSummary: row.parking_summary,
    mapUrl: row.map_url,
    publicNoteCount: Number(row.public_note_count),
    lastNoteAt: row.last_note_at ? row.last_note_at.toISOString() : null,
  };
}

/** 구장 가이드가 있는 구장 + 공개 메모만 있는 구장(예: 제2구장)을 함께 보여준다. */
const STADIUM_SUMMARY_SQL = `
  SELECT s.stadium,
         sg.food_summary,
         sg.parking_summary,
         sg.map_url,
         COALESCE(n.public_note_count, 0) AS public_note_count,
         n.last_note_at
  FROM (
    SELECT stadium FROM stadium_guides
    UNION
    SELECT stadium FROM user_stadium_notes WHERE is_public = TRUE
  ) s
  LEFT JOIN stadium_guides sg ON sg.stadium = s.stadium
  LEFT JOIN (
    SELECT stadium,
           COUNT(*) AS public_note_count,
           MAX(updated_at) AS last_note_at
    FROM user_stadium_notes
    WHERE is_public = TRUE
    GROUP BY stadium
  ) n ON n.stadium = s.stadium`;

export async function listStadiumSummaries() {
  const [rows] = await db.query<StadiumSummaryRow[]>(
    `${STADIUM_SUMMARY_SQL}
     ORDER BY (sg.stadium IS NULL), public_note_count DESC, s.stadium`,
  );

  return rows.map(toStadiumSummary);
}

export async function findStadiumSummary(stadium: string) {
  const [rows] = await db.query<StadiumSummaryRow[]>(
    `${STADIUM_SUMMARY_SQL}
     WHERE s.stadium = ?
     LIMIT 1`,
    [stadium],
  );

  return rows[0] ? toStadiumSummary(rows[0]) : null;
}

/** 키워드 필터·하이라이트는 화면에서 즉시 처리하도록 최근 공개 메모를 한 번에 내려준다. */
export async function listPublicStadiumNotes(stadium: string) {
  const [rows] = await db.query<PublicStadiumNoteRow[]>(
    `SELECT n.id,
            n.user_id,
            n.food_memo,
            n.parking_memo,
            n.updated_at,
            u.nickname AS author_nickname,
            u.role AS author_role,
            u.profile_image_url AS author_profile_image_url,
            t.short_name AS author_favorite_team_short_name
     FROM user_stadium_notes n
     JOIN users u ON u.id = n.user_id
     LEFT JOIN teams t ON t.id = u.favorite_team_id
     WHERE n.stadium = ?
       AND n.is_public = TRUE
     ORDER BY n.updated_at DESC, n.id DESC
     LIMIT ?`,
    [stadium, MAX_PUBLIC_NOTES],
  );

  return rows.map(
    (row): PublicStadiumNote => ({
      id: row.id,
      foodMemo: row.food_memo,
      parkingMemo: row.parking_memo,
      updatedAt: row.updated_at.toISOString(),
      author: {
        id: row.user_id,
        nickname: row.author_nickname,
        role: row.author_role,
        profileImageUrl: row.author_profile_image_url,
        favoriteTeamShortName: row.author_favorite_team_short_name,
      },
    }),
  );
}
