import { GAME_TABLES, truncateTables, USER_TABLES } from './truncate-tables.js';

/** teams, stadium_guides, players, 응원가 마스터는 유지 */
export async function clearAppData() {
  await truncateTables([...new Set([...USER_TABLES, ...GAME_TABLES])]);
}

/** 경기 일정은 유지하고 사용자와 사용자가 만든 데이터만 삭제 */
export async function clearUserData() {
  await truncateTables(USER_TABLES);
}
