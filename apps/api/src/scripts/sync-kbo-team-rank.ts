import { runMigrations } from '../config/migrations.js';
import { syncKboTeamRank } from '../modules/kbo-team-rank/sync-team-rank.js';

await runMigrations();

const result = await syncKboTeamRank();

console.log(
  `[kbo-standings] 완료 — ${result.seasonYear}시즌 ${result.rankDate} 기준 ${result.teamCount}팀 (series=${result.seriesId})`,
);
