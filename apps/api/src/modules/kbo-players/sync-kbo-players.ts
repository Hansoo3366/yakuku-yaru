import { syncLog } from '../../lib/sync-log.js';
import {
  fetchKboHitterSeasonStatsByTeam,
  fetchKboPlayersByTeam,
  KBO_TEAM_CODES,
  type KboTeamCode,
} from './kbo-player.client.js';
import {
  listTeamIdsByShortName,
  updatePlayerSeasonHittingStats,
  upsertPlayer,
} from './player.repository.js';

export async function syncKboPlayers(input?: { teamCodes?: KboTeamCode[] }) {
  const teamCodes = input?.teamCodes?.length ? input.teamCodes : KBO_TEAM_CODES;
  const teamIds = await listTeamIdsByShortName();
  let parsed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let hittingStatsParsed = 0;
  let hittingStatsUpdated = 0;

  syncLog('kbo-players', `시작 — ${teamCodes.length}팀 (팀당 1~3분 소요)`);

  for (let index = 0; index < teamCodes.length; index += 1) {
    const teamCode = teamCodes[index];
    const step = `${index + 1}/${teamCodes.length}`;

    syncLog('kbo-players', `${step} ${teamCode} 선수 목록 조회 중…`);
    const players = await fetchKboPlayersByTeam(teamCode);
    parsed += players.length;

    syncLog(
      'kbo-players',
      `${step} ${teamCode} 선수 ${players.length}명 DB 반영 중…`,
    );

    let teamInserted = 0;
    let teamUpdated = 0;
    let teamSkipped = 0;

    for (const player of players) {
      const result = await upsertPlayer(player, teamIds);

      if (result === 'inserted') {
        inserted += 1;
        teamInserted += 1;
      } else if (result === 'updated') {
        updated += 1;
        teamUpdated += 1;
      } else {
        skipped += 1;
        teamSkipped += 1;
      }
    }

    syncLog('kbo-players', `${step} ${teamCode} 타율·OPS 조회 중…`);
    const hitterStats = await fetchKboHitterSeasonStatsByTeam(teamCode);
    hittingStatsParsed += hitterStats.length;

    let teamHittingUpdated = 0;

    for (const stats of hitterStats) {
      const affected = await updatePlayerSeasonHittingStats({
        kboPlayerId: stats.kboPlayerId,
        seasonBattingAvg: stats.seasonBattingAvg,
        seasonOps: stats.seasonOps,
      });

      if (affected > 0) {
        hittingStatsUpdated += 1;
        teamHittingUpdated += 1;
      }
    }

    syncLog(
      'kbo-players',
      `${step} ${teamCode} 완료 — 선수 +${teamInserted}/~${teamUpdated}/건너뜀${teamSkipped}, 타격지표 ${teamHittingUpdated}/${hitterStats.length}`,
    );
  }

  return {
    teamCount: teamCodes.length,
    parsed,
    inserted,
    updated,
    skipped,
    hittingStatsParsed,
    hittingStatsUpdated,
  };
}
