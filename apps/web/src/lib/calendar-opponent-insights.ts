import type { AttendanceRecord } from '@/lib/attendance-api';
import { getFavoriteTeamGameOutcome, type GameOutcome } from '@/lib/game-outcome';

export type OpponentInsightItem = {
  teamId: number;
  shortName: string;
  rate: number;
  games: number;
};

export type CalendarOpponentInsights = {
  teamWinRateHigh: OpponentInsightItem | null;
  teamWinRateLow: OpponentInsightItem | null;
  stadiumWinRateHigh: OpponentInsightItem | null;
  stadiumWinRateLow: OpponentInsightItem | null;
};

type OpponentAccumulator = {
  teamId: number;
  shortName: string;
  wins: number;
  decided: number;
};

function getOpponentTeamId(
  record: AttendanceRecord,
  favoriteTeamId: number,
): { id: number; shortName: string } | null {
  if (record.game.homeTeam.id === favoriteTeamId) {
    return {
      id: record.game.awayTeam.id,
      shortName: record.game.awayTeam.shortName,
    };
  }

  if (record.game.awayTeam.id === favoriteTeamId) {
    return {
      id: record.game.homeTeam.id,
      shortName: record.game.homeTeam.shortName,
    };
  }

  return null;
}

function isDecidedTeamOutcome(
  outcome: GameOutcome,
): outcome is 'win' | 'lose' | 'draw' {
  return outcome === 'win' || outcome === 'lose' || outcome === 'draw';
}

function pickExtreme(
  entries: OpponentAccumulator[],
  direction: 'high' | 'low',
): OpponentInsightItem | null {
  const rated = entries
    .filter((entry) => entry.decided > 0)
    .map((entry) => ({
      teamId: entry.teamId,
      shortName: entry.shortName,
      rate: Math.round((entry.wins / entry.decided) * 100),
      games: entry.decided,
    }));

  if (!rated.length) {
    return null;
  }

  return rated.sort((left, right) => {
    if (left.rate !== right.rate) {
      return direction === 'high' ? right.rate - left.rate : left.rate - right.rate;
    }

    return right.games - left.games;
  })[0];
}

export function getCalendarOpponentInsights(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): CalendarOpponentInsights {
  if (!favoriteTeamId) {
    return {
      teamWinRateHigh: null,
      teamWinRateLow: null,
      stadiumWinRateHigh: null,
      stadiumWinRateLow: null,
    };
  }

  const teamStats = new Map<number, OpponentAccumulator>();
  const stadiumStats = new Map<number, OpponentAccumulator>();

  for (const record of records) {
    if (record.viewerRelation !== 'owner') {
      continue;
    }

    const opponent = getOpponentTeamId(record, favoriteTeamId);

    if (!opponent) {
      continue;
    }

    const teamOutcome = getFavoriteTeamGameOutcome(
      record.game,
      favoriteTeamId,
      record.result,
    );

    if (isDecidedTeamOutcome(teamOutcome)) {
      const current = teamStats.get(opponent.id) ?? {
        teamId: opponent.id,
        shortName: opponent.shortName,
        wins: 0,
        decided: 0,
      };
      current.decided += 1;

      if (teamOutcome === 'win') {
        current.wins += 1;
      }

      teamStats.set(opponent.id, current);
    }

    if (record.watchType !== 'stadium' || !isDecidedTeamOutcome(teamOutcome)) {
      continue;
    }

    const stadiumCurrent = stadiumStats.get(opponent.id) ?? {
      teamId: opponent.id,
      shortName: opponent.shortName,
      wins: 0,
      decided: 0,
    };
    stadiumCurrent.decided += 1;

    if (teamOutcome === 'win') {
      stadiumCurrent.wins += 1;
    }

    stadiumStats.set(opponent.id, stadiumCurrent);
  }

  const teamEntries = [...teamStats.values()];
  const stadiumEntries = [...stadiumStats.values()];

  return {
    teamWinRateHigh: pickExtreme(teamEntries, 'high'),
    teamWinRateLow: pickExtreme(teamEntries, 'low'),
    stadiumWinRateHigh: pickExtreme(stadiumEntries, 'high'),
    stadiumWinRateLow: pickExtreme(stadiumEntries, 'low'),
  };
}

export function formatOpponentInsight(item: OpponentInsightItem | null) {
  if (!item) {
    return '—';
  }

  return `${item.shortName} ${item.rate}%`;
}
