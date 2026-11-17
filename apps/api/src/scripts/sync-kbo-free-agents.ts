import { installCrashAlerts } from '../lib/error-alert.js';
import { runMigrations } from '../config/migrations.js';
import {
  getCurrentStoveLeagueYear,
  syncKboFreeAgents,
} from '../modules/free-agents/sync-free-agents.js';

installCrashAlerts('kbo-sync:free-agents');

await runMigrations();

// 예: npm run sync:kbo-free-agents -- 2025
const requestedYear = Number(process.argv[2]);
const faYear =
  Number.isSafeInteger(requestedYear) && requestedYear >= 2000
    ? requestedYear
    : (getCurrentStoveLeagueYear() ?? new Date().getFullYear() - 1);

const result = await syncKboFreeAgents(faYear);

console.log(
  `[kbo-free-agents] 완료 — ${result.faYear} 스토브리그 자격 ${result.qualified}명, 계약 ${result.signed}건, 사진 ${result.linked}명`,
);

process.exit(0);
