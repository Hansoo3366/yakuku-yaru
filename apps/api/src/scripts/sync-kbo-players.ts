import { syncLog } from '../lib/sync-log.js';
import { runMigrations } from '../config/migrations.js';
import {
  KBO_TEAM_CODES,
  type KboTeamCode,
} from '../modules/kbo-players/kbo-player.client.js';
import { syncKboPlayers } from '../modules/kbo-players/sync-kbo-players.js';

function parseArgs(argv: string[]) {
  const teamCodes = argv
    .filter((arg) => arg.startsWith('--team='))
    .map((arg) => arg.slice('--team='.length).toUpperCase())
    .filter((teamCode): teamCode is KboTeamCode =>
      KBO_TEAM_CODES.includes(teamCode as KboTeamCode),
    );

  return { teamCodes };
}

const { teamCodes } = parseArgs(process.argv.slice(2));

await runMigrations();

syncLog('kbo-players', '마이그레이션 완료, 동기화 시작');

const result = await syncKboPlayers({
  teamCodes: teamCodes.length ? teamCodes : undefined,
});

console.log(
  `[kbo-players] 완료 — ${result.teamCount}팀, 파싱 ${result.parsed}명, 추가 ${result.inserted}명, 갱신 ${result.updated}명, 건너뜀 ${result.skipped}명, 타격지표 ${result.hittingStatsUpdated}/${result.hittingStatsParsed}명`,
);

process.exit(0);
