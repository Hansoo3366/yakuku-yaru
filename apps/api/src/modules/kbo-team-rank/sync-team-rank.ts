import { listTeamIdsByShortName } from '../kbo-schedule/kbo-game.repository.js';
import { fetchKboTeamRankDailyPage } from './kbo-team-rank.client.js';
import { parseKboTeamRankHtml } from './parse-team-rank.js';
import { replaceTeamStandings } from './team-rank.repository.js';

export async function syncKboTeamRank() {
  const html = await fetchKboTeamRankDailyPage();
  const parsed = parseKboTeamRankHtml(html);
  const teamIds = await listTeamIdsByShortName();

  const mapped = parsed.standings.map((standing) => {
    const teamId = teamIds.get(standing.teamShortName);

    if (!teamId) {
      throw new Error(`팀 매핑 실패: ${standing.teamShortName}`);
    }

    return {
      ...standing,
      teamId,
    };
  });

  await replaceTeamStandings({
    seasonYear: parsed.seasonYear,
    rankDate: parsed.rankDate,
    seriesId: parsed.seriesId,
    standings: mapped,
  });

  return {
    seasonYear: parsed.seasonYear,
    rankDate: parsed.rankDate,
    seriesId: parsed.seriesId,
    teamCount: mapped.length,
  };
}
