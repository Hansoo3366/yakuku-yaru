import { db } from '../../config/database.js';

/** users·게시판 유지, 경기·직관·경기 알림만 삭제 */
export async function clearGamesData() {
  await db.execute('SET FOREIGN_KEY_CHECKS = 0');
  await db.execute('TRUNCATE TABLE attendance_companions');
  await db.execute('TRUNCATE TABLE attendance_records');
  await db.execute('TRUNCATE TABLE game_reminders');
  await db.execute('TRUNCATE TABLE games');
  await db.execute('SET FOREIGN_KEY_CHECKS = 1');
}
