import { listGames } from '../games/game.repository.js';
import { listTeamStandings } from '../kbo-team-rank/team-rank.repository.js';
import {
  DEFAULT_PROJECTION_SIMULATIONS,
  SEASON_PROJECTION_MODEL_VERSION,
  calculateSeasonProjection,
} from './season-projection-calculator.js';
import { replaceSeasonProjection } from './season-projection.repository.js';

function seasonRange(seasonYear: number) {
  return {
    from: `${seasonYear}-03-01`,
    to: `${seasonYear + 1}-01-01`,
  };
}

export async function generateKboSeasonProjection(input: {
  seasonYear?: number;
  seriesId?: string;
  simulations?: number;
} = {}) {
  const seasonYear = input.seasonYear ?? new Date().getFullYear();
  const seriesId = input.seriesId ?? '0';
  const simulations = input.simulations ?? DEFAULT_PROJECTION_SIMULATIONS;
  const standings = await listTeamStandings(seasonYear, seriesId);

  if (!standings) {
    return {
      stored: false as const,
      reason: 'NO_STANDINGS',
      seasonYear,
      seriesId,
      modelVersion: SEASON_PROJECTION_MODEL_VERSION,
    };
  }

  const games = await listGames(seasonRange(seasonYear));
  const projection = calculateSeasonProjection(standings, games, simulations);

  if (!projection) {
    return {
      stored: false as const,
      reason: 'NOT_ENOUGH_DATA',
      seasonYear,
      seriesId,
      modelVersion: SEASON_PROJECTION_MODEL_VERSION,
    };
  }

  const snapshotId = await replaceSeasonProjection(projection);

  return {
    stored: true as const,
    snapshotId,
    seasonYear: projection.seasonYear,
    rankDate: projection.rankDate,
    seriesId: projection.seriesId,
    modelVersion: projection.modelVersion,
    teamCount: projection.rows.length,
    simulations: projection.simulations,
  };
}
