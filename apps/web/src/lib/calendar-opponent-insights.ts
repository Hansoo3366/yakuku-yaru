import type { AttendanceRecord } from '@/lib/attendance-api';
import { getFavoriteTeamGameOutcome, type GameOutcome } from '@/lib/game-outcome';

export type OpponentInsightItem = {
  teamId: number;
  shortName: string;
  rate: number;
  games: number;
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

export function pickOpponentExtreme(
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

export function getStadiumAttendanceOpponentInsights(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): {
  stadiumWinRateHigh: OpponentInsightItem | null;
  stadiumWinRateLow: OpponentInsightItem | null;
} {
  if (!favoriteTeamId) {
    return { stadiumWinRateHigh: null, stadiumWinRateLow: null };
  }

  const stadiumOpponentStats = new Map<number, OpponentAccumulator>();

  for (const record of records) {
    if (record.viewerRelation !== 'owner' || record.watchType !== 'stadium') {
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

    if (!isDecidedTeamOutcome(teamOutcome)) {
      continue;
    }

    const stadiumCurrent = stadiumOpponentStats.get(opponent.id) ?? {
      teamId: opponent.id,
      shortName: opponent.shortName,
      wins: 0,
      decided: 0,
    };
    stadiumCurrent.decided += 1;

    if (teamOutcome === 'win') {
      stadiumCurrent.wins += 1;
    }

    stadiumOpponentStats.set(opponent.id, stadiumCurrent);
  }

  const stadiumEntries = [...stadiumOpponentStats.values()];

  return {
    stadiumWinRateHigh: pickOpponentExtreme(stadiumEntries, 'high'),
    stadiumWinRateLow: pickOpponentExtreme(stadiumEntries, 'low'),
  };
}
