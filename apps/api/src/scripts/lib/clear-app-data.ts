import { db } from '../../config/database.js';

/** teams, stadium_guides 는 유지 */
export async function clearAppData() {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE comments');
  await db.execute('TRUNCATE TABLE posts');
  await db.execute('TRUNCATE TABLE notifications');
  await db.execute('TRUNCATE TABLE attendance_companions');
  await db.execute('TRUNCATE TABLE attendance_records');
  await db.execute('TRUNCATE TABLE game_reminders');
  await db.execute('TRUNCATE TABLE password_reset_tokens');
  await db.execute('TRUNCATE TABLE email_verification_tokens');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('TRUNCATE TABLE games');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');
}

/** 경기·사용자 제외 사용자 생성 데이터만 삭제 */
export async function clearUserData() {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE comments');
  await db.execute('TRUNCATE TABLE posts');
  await db.execute('TRUNCATE TABLE notifications');
  await db.execute('TRUNCATE TABLE attendance_companions');
  await db.execute('TRUNCATE TABLE attendance_records');
  await db.execute('TRUNCATE TABLE game_reminders');
  await db.execute('TRUNCATE TABLE password_reset_tokens');
  await db.execute('TRUNCATE TABLE email_verification_tokens');
  await db.execute('TRUNCATE TABLE users');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');
}
