import {
  fetchKboPlayersByTeam,
  KBO_TEAM_CODES,
  type KboTeamCode,
} from './kbo-player.client.js';
import { listTeamIdsByShortName, upsertPlayer } from './player.repository.js';

export async function syncKboPlayers(input?: { teamCodes?: KboTeamCode[] }) {
  const teamCodes = input?.teamCodes?.length ? input.teamCodes : KBO_TEAM_CODES;
  const teamIds = await listTeamIdsByShortName();
  let parsed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const teamCode of teamCodes) {
    const players = await fetchKboPlayersByTeam(teamCode);
    parsed += players.length;

    for (const player of players) {
      const result = await upsertPlayer(player, teamIds);

      if (result === 'inserted') inserted += 1;
      else if (result === 'updated') updated += 1;
      else skipped += 1;
    }
  }

  return {
    teamCount: teamCodes.length,
    parsed,
    inserted,
    updated,
    skipped,
  };
}
