import { syncLog } from '../../lib/sync-log.js';
import { listTeamIdsByShortName } from '../kbo-schedule/kbo-game.repository.js';
import {
  fetchKboTradeRows,
  KBO_TRADE_SECTIONS,
} from './kbo-free-agent.client.js';
import {
  applyFreeAgentContract,
  linkFreeAgentPlayers,
  upsertQualifiedFreeAgent,
} from './free-agent.repository.js';
import {
  getKoreaDateKey,
  getStoveLeagueYear,
  isContractInStoveLeague,
} from './parse-free-agent.js';

/** 지금이 스토브리그면 그해, 아니면 null. 매일 동기화가 비시즌에만 FA 를 받는다. */
export function getCurrentStoveLeagueYear(now = new Date()) {
  return getStoveLeagueYear(getKoreaDateKey(now));
}

/**
 * faYear 스토브리그의 FA 명단과 계약 팀을 받는다.
 * 자격 공시는 faYear 11월, 계약은 faYear 11월 ~ 이듬해 봄이라 두 해를 함께 본다.
 */
export async function syncKboFreeAgents(faYear: number) {
  const teamIds = await listTeamIdsByShortName();
  const currentYear = Number(getKoreaDateKey(new Date()).slice(0, 4));
  const qualified = await fetchKboTradeRows({
    seasonYear: faYear,
    section: KBO_TRADE_SECTIONS.faQualified,
  });

  let inserted = 0;
  let unknownTeams = 0;

  for (const row of qualified) {
    const teamId = teamIds.get(row.teamShortName);

    if (!teamId) {
      unknownTeams += 1;
      continue;
    }

    const result = await upsertQualifiedFreeAgent({
      faYear,
      playerName: row.playerName,
      position: row.position,
      previousTeamId: teamId,
      qualifiedOn: row.date,
    });

    if (result === 'inserted') inserted += 1;
  }

  const qualifiedOn = qualified.map((row) => row.date).sort()[0];
  let signed = 0;

  if (qualifiedOn) {
    const contractYears = [faYear, faYear + 1].filter(
      (year) => year <= currentYear,
    );

    for (const seasonYear of contractYears) {
      const contracts = await fetchKboTradeRows({
        seasonYear,
        section: KBO_TRADE_SECTIONS.faContract,
      });

      for (const row of contracts) {
        const teamId = teamIds.get(row.teamShortName);

        if (
          !teamId ||
          !isContractInStoveLeague(row.date, faYear, qualifiedOn)
        ) {
          continue;
        }

        signed += await applyFreeAgentContract({
          faYear,
          playerName: row.playerName,
          position: row.position,
          newTeamId: teamId,
          signedOn: row.date,
        });
      }
    }
  }

  const linked = await linkFreeAgentPlayers(faYear);

  syncLog(
    'kbo-free-agents',
    `${faYear} 스토브리그 — 자격 ${qualified.length}명(신규 ${inserted}), 계약 반영 ${signed}건, 사진 연결 ${linked}명`,
  );

  return {
    faYear,
    qualified: qualified.length,
    inserted,
    signed,
    linked,
    unknownTeams,
  };
}
