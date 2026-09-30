import { fetchKboMonthSchedule } from './kbo-schedule.client.js';
import { parseKboScheduleTable } from './parse-schedule.js';
import { listTeamIdsByShortName, upsertKboGame } from './kbo-game.repository.js';

export type SyncKboScheduleSummary = {
  seasonYear: number;
  months: number[];
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
};

export async function syncKboScheduleForMonth(seasonYear: number, month: number) {
  const table = await fetchKboMonthSchedule({ seasonYear, month });
  const parsedGames = parseKboScheduleTable(table, seasonYear);
  const teamIds = await listTeamIdsByShortName();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const game of parsedGames) {
    const result = await upsertKboGame(game, teamIds);

    if (result === 'inserted') inserted += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
  }

  return {
    seasonYear,
    month,
    parsed: parsedGames.length,
    inserted,
    updated,
    skipped,
  };
}
