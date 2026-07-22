import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../config/database.js';

type FanSummaryRow = RowDataPacket & {
  id: number;
  nickname: string;
  profile_image_url: string | null;
  favorite_team_id: number | null;
  favorite_team_name: string | null;
  favorite_team_short_name: string | null;
  favorite_team_primary_color: string | null;
  attendance_count: number;
  stadium_count: number;
  post_count: number;
  connection_count: number;
  follower_count: number;
  following_count: number;
  is_following: number;
  last_active_at: Date;
};

export type FanSummary = {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  favoriteTeam: {
    id: number;
    name: string;
    shortName: string;
    primaryColor: string | null;
  } | null;
  attendanceCount: number;
  stadiumCount: number;
  postCount: number;
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  lastActiveAt: Date;
};

function toFanSummary(row: FanSummaryRow, viewerUserId: number | null): FanSummary {
  return {
    id: Number(row.id),
    nickname: row.nickname,
    profileImageUrl: row.profile_image_url,
    favoriteTeam:
      row.favorite_team_id &&
      row.favorite_team_name &&
      row.favorite_team_short_name
        ? {
            id: Number(row.favorite_team_id),
            name: row.favorite_team_name,
            shortName: row.favorite_team_short_name,
            primaryColor: row.favorite_team_primary_color,
          }
        : null,
    attendanceCount: Number(row.attendance_count ?? 0),
    stadiumCount: Number(row.stadium_count ?? 0),
    postCount: Number(row.post_count ?? 0),
    connectionCount: Number(row.connection_count ?? 0),
    followerCount: Number(row.follower_count ?? 0),
    followingCount: Number(row.following_count ?? 0),
    isFollowing: Boolean(row.is_following),
    isSelf: viewerUserId === Number(row.id),
    lastActiveAt: row.last_active_at,
  };
}

const summarySelect = `
  SELECT
    u.id,
    u.nickname,
    u.profile_image_url,
    t.id AS favorite_team_id,
    t.name AS favorite_team_name,
    t.short_name AS favorite_team_short_name,
    t.primary_color AS favorite_team_primary_color,
    COALESCE(attendance.attendance_count, 0) AS attendance_count,
    COALESCE(attendance.stadium_count, 0) AS stadium_count,
    COALESCE(post_stats.post_count, 0) AS post_count,
    COALESCE(connection_stats.connection_count, 0) AS connection_count,
    COALESCE(follower_stats.follower_count, 0) AS follower_count,
    COALESCE(following_stats.following_count, 0) AS following_count,
    CASE WHEN viewer_follow.follower_user_id IS NULL THEN 0 ELSE 1 END AS is_following,
    GREATEST(
      u.updated_at,
      COALESCE(attendance.last_attendance_at, u.created_at),
      COALESCE(post_stats.last_post_at, u.created_at)
    ) AS last_active_at
  FROM users u
  LEFT JOIN teams t ON t.id = u.favorite_team_id
  LEFT JOIN (
    SELECT
      participation.user_id,
      COUNT(DISTINCT participation.game_id) AS attendance_count,
      COUNT(DISTINCT CASE WHEN participation.watch_type = 'stadium' THEN participation.game_id END) AS stadium_count,
      MAX(participation.created_at) AS last_attendance_at
    FROM (
      SELECT ar.user_id, ar.game_id, ar.watch_type, ar.created_at
      FROM attendance_records ar
      UNION ALL
      SELECT ac.user_id, ar.game_id, ar.watch_type, ac.created_at
      FROM attendance_companions ac
      JOIN attendance_records ar ON ar.id = ac.attendance_record_id
      WHERE ac.status = 'accepted'
    ) participation
    JOIN games g ON g.id = participation.game_id
    WHERE g.game_date >= ? AND g.game_date < ?
    GROUP BY participation.user_id
  ) attendance ON attendance.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS post_count, MAX(created_at) AS last_post_at
    FROM posts
    GROUP BY user_id
  ) post_stats ON post_stats.user_id = u.id
  LEFT JOIN (
    SELECT connections.user_id, COUNT(DISTINCT connections.connected_user_id) AS connection_count
    FROM (
      SELECT ar.user_id, ac.user_id AS connected_user_id
      FROM attendance_records ar
      JOIN attendance_companions ac ON ac.attendance_record_id = ar.id
      WHERE ac.status = 'accepted'
      UNION ALL
      SELECT ac.user_id, ar.user_id AS connected_user_id
      FROM attendance_records ar
      JOIN attendance_companions ac ON ac.attendance_record_id = ar.id
      WHERE ac.status = 'accepted'
    ) connections
    GROUP BY connections.user_id
  ) connection_stats ON connection_stats.user_id = u.id
  LEFT JOIN (
    SELECT followed_user_id, COUNT(*) AS follower_count
    FROM user_follows
    GROUP BY followed_user_id
  ) follower_stats ON follower_stats.followed_user_id = u.id
  LEFT JOIN (
    SELECT follower_user_id, COUNT(*) AS following_count
    FROM user_follows
    GROUP BY follower_user_id
  ) following_stats ON following_stats.follower_user_id = u.id
  LEFT JOIN user_follows viewer_follow
    ON viewer_follow.follower_user_id = ?
   AND viewer_follow.followed_user_id = u.id`;

function currentSeasonRange() {
  const year = new Date().getFullYear();
  return [`${year}-01-01`, `${year + 1}-01-01`] as const;
}

export async function discoverFans(input: {
  viewerUserId: number | null;
  keyword?: string;
  teamId?: number | null;
  page: number;
  size: number;
}) {
  const [from, to] = currentSeasonRange();
  const viewerUserId = input.viewerUserId ?? 0;
  const conditions: string[] = [];
  const filterParams: Array<number | string> = [];

  if (input.keyword) {
    conditions.push('u.nickname LIKE ?');
    filterParams.push(`%${input.keyword}%`);
  }

  if (input.teamId) {
    conditions.push('u.favorite_team_id = ?');
    filterParams.push(input.teamId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (input.page - 1) * input.size;
  const [rows] = await db.query<FanSummaryRow[]>(
    `${summarySelect}
     ${whereClause}
     ORDER BY
       CASE
         WHEN u.favorite_team_id = (SELECT favorite_team_id FROM users WHERE id = ?) THEN 0
         ELSE 1
       END,
       last_active_at DESC,
       u.id DESC
     LIMIT ? OFFSET ?`,
    [from, to, viewerUserId, ...filterParams, viewerUserId, input.size, offset],
  );

  const [countRows] = await db.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
    filterParams,
  );

  return {
    items: rows.map((row) => toFanSummary(row, input.viewerUserId)),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function findFanSummaryById(input: {
  userId: number;
  viewerUserId: number | null;
}) {
  const [from, to] = currentSeasonRange();
  const [rows] = await db.query<FanSummaryRow[]>(
    `${summarySelect}
     WHERE u.id = ?
     LIMIT 1`,
    [from, to, input.viewerUserId ?? 0, input.userId],
  );

  return rows[0] ? toFanSummary(rows[0], input.viewerUserId) : null;
}

export async function countSharedAttendanceGames(input: {
  firstUserId: number;
  secondUserId: number;
}) {
  if (input.firstUserId === input.secondUserId) {
    return 0;
  }

  const [rows] = await db.query<(RowDataPacket & { shared_count: number })[]>(
    `SELECT COUNT(DISTINCT ar.game_id) AS shared_count
     FROM attendance_records ar
     WHERE (
       ar.user_id = ?
       OR EXISTS (
         SELECT 1 FROM attendance_companions ac
         WHERE ac.attendance_record_id = ar.id
           AND ac.user_id = ?
           AND ac.status = 'accepted'
       )
     )
       AND (
         ar.user_id = ?
         OR EXISTS (
           SELECT 1 FROM attendance_companions ac
           WHERE ac.attendance_record_id = ar.id
             AND ac.user_id = ?
             AND ac.status = 'accepted'
         )
       )`,
    [
      input.firstUserId,
      input.firstUserId,
      input.secondUserId,
      input.secondUserId,
    ],
  );

  return Number(rows[0]?.shared_count ?? 0);
}

export async function followUser(input: {
  followerUserId: number;
  followedUserId: number;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO user_follows (follower_user_id, followed_user_id)
     VALUES (?, ?)`,
    [input.followerUserId, input.followedUserId],
  );

  return result.affectedRows > 0;
}

export async function unfollowUser(input: {
  followerUserId: number;
  followedUserId: number;
}) {
  const [result] = await db.execute<ResultSetHeader>(
    `DELETE FROM user_follows
     WHERE follower_user_id = ? AND followed_user_id = ?`,
    [input.followerUserId, input.followedUserId],
  );

  return result.affectedRows > 0;
}

