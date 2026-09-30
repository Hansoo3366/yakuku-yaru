import { GAME_TABLES, truncateTables } from './truncate-tables.js';

/** users·게시판 유지, 경기와 경기에 묶인 직관·라인업·경기 알림만 삭제 */
export async function clearGamesData() {
  await truncateTables(GAME_TABLES);
}
