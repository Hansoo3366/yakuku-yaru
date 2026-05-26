import type { Game, TeamStandingsResponse } from '@/lib/baseball-api';
import type { WinRateSnapshot } from '@/lib/calendar-win-rates';
import {
  type OpponentInsightRankings,
  pickOpponentRankedList,
} from '@/lib/calendar-opponent-insights';
import { getFavoriteTeamGameOutcome } from '@/lib/game-outcome';

type OpponentAccumulator = {
  teamId: number;
  shortName: string;
  wins: number;
  losses: number;
  draws: number;
  decided: number;
};

function getOpponentFromGame(game: Game, favoriteTeamId: number) {
  if (game.homeTeam.id === favoriteTeamId) {
    return {
      id: game.awayTeam.id,
      shortName: game.awayTeam.shortName,
    };
  }

  if (game.awayTeam.id === favoriteTeamId) {
    return {
      id: game.homeTeam.id,
      shortName: game.homeTeam.shortName,
    };
  }

  return null;
}

export function getKboFavoriteTeamSeasonWinRate(
  standings: TeamStandingsResponse | null,
  favoriteTeamId: number | null | undefined,
): WinRateSnapshot {
  if (!standings?.items.length || !favoriteTeamId) {
    return { rate: null, decidedCount: 0 };
  }

  const team = standings.items.find((item) => item.teamId === favoriteTeamId);

  if (!team || team.games <= 0) {
    return { rate: null, decidedCount: 0 };
  }

  return {
    rate: Math.round(team.winRate * 100),
    decidedCount: team.games,
  };
}

export function getKboOpponentWinRateInsights(
  games: Game[],
  favoriteTeamId: number | null | undefined,
): OpponentInsightRankings {
  if (!favoriteTeamId) {
    return { high: [], low: [] };
  }

  const stats = new Map<number, OpponentAccumulator>();

  for (const game of games) {
    const opponent = getOpponentFromGame(game, favoriteTeamId);

    if (!opponent) {
      continue;
    }

    const outcome = getFavoriteTeamGameOutcome(game, favoriteTeamId, null);

    if (outcome !== 'win' && outcome !== 'lose' && outcome !== 'draw') {
      continue;
    }

    const current = stats.get(opponent.id) ?? {
      teamId: opponent.id,
      shortName: opponent.shortName,
      wins: 0,
      losses: 0,
      draws: 0,
      decided: 0,
    };
    current.decided += 1;

    if (outcome === 'win') {
      current.wins += 1;
    } else if (outcome === 'lose') {
      current.losses += 1;
    } else {
      current.draws += 1;
    }

    stats.set(opponent.id, current);
  }

  const entries = [...stats.values()];

  return {
    high: pickOpponentRankedList(entries, 'high'),
    low: pickOpponentRankedList(entries, 'low'),
  };
}
