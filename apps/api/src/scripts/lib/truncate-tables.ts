import { db } from '../../config/database.js';

/**
 * FOREIGN_KEY_CHECKS 는 연결 단위 설정이라, 풀에서 매번 다른 연결을 받으면 꺼지지 않을 수 있다.
 * 연결 하나를 잡고 그 안에서 모두 비운다.
 */
export async function truncateTables(tables: readonly string[]) {
  const connection = await db.getConnection();

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    connection.release();
  }
}

/** 경기 id 를 참조하는 테이블. games 를 비우면 id 가 1부터 다시 매겨지므로 함께 비워야 한다. */
export const GAME_TABLES = [
  'attendance_companions',
  'attendance_records',
  'attendance_viewer_preferences',
  'game_reminders',
  'game_lineups',
  'game_starting_pitchers',
  'games',
] as const;

/**
 * 사용자 id 를 참조하는 테이블. users 를 비우면 id 가 1부터 다시 매겨지므로,
 * 남은 refresh_sessions 등이 새로 만든 같은 id 의 사용자(시드 관리자 포함)에게 붙지 않도록 함께 비운다.
 */
export const USER_TABLES = [
  'comments',
  'posts',
  'notifications',
  'content_reports',
  'attendance_companions',
  'attendance_records',
  'attendance_viewer_preferences',
  'game_reminders',
  'user_follows',
  'user_stadium_notes',
  'refresh_sessions',
  'password_reset_tokens',
  'email_verification_tokens',
  'users',
] as const;
