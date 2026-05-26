import type { AttendanceRecord } from '@/lib/attendance-api';
import { countsTowardWinRate } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';

export type OpponentInsightItem = {
  teamId: number;
  shortName: string;
  rate: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
};

export type RankedOpponentInsightItem = OpponentInsightItem & {
  rank: number;
};

export type OpponentInsightRankings = {
  high: RankedOpponentInsightItem[];
  low: RankedOpponentInsightItem[];
};

type OpponentAccumulator = {
  teamId: number;
  shortName: string;
  wins: number;
  losses: number;
  draws: number;
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

function applyOutcomeToAccumulator(
  accumulator: OpponentAccumulator,
  outcome: 'win' | 'lose' | 'draw',
) {
  accumulator.decided += 1;

  if (outcome === 'win') {
    accumulator.wins += 1;
    return;
  }

  if (outcome === 'lose') {
    accumulator.losses += 1;
    return;
  }

  accumulator.draws += 1;
}

function toOpponentInsightItem(entry: OpponentAccumulator): OpponentInsightItem {
  return {
    teamId: entry.teamId,
    shortName: entry.shortName,
    rate: Math.round((entry.wins / entry.decided) * 100),
    games: entry.decided,
    wins: entry.wins,
    losses: entry.losses,
    draws: entry.draws,
  };
}

function sortOpponentItems(
  items: OpponentInsightItem[],
  direction: 'high' | 'low',
) {
  return [...items].sort((left, right) => {
    if (left.rate !== right.rate) {
      return direction === 'high' ? right.rate - left.rate : left.rate - right.rate;
    }

    return right.games - left.games;
  });
}

export function assignCompetitionRanks(
  items: OpponentInsightItem[],
): RankedOpponentInsightItem[] {
  let rank = 0;

  return items.map((item, index) => {
    if (index === 0 || item.rate !== items[index - 1].rate) {
      rank = index + 1;
    }

    return { ...item, rank };
  });
}

export function pickOpponentRankedList(
  entries: OpponentAccumulator[],
  direction: 'high' | 'low',
  limit?: number,
): RankedOpponentInsightItem[] {
  const rated = entries
    .filter((entry) => entry.decided > 0)
    .map(toOpponentInsightItem);

  const sorted = sortOpponentItems(rated, direction);
  const sliced = limit === undefined ? sorted : sorted.slice(0, limit);

  return assignCompetitionRanks(sliced);
}

export function pickOpponentExtreme(
  entries: OpponentAccumulator[],
  direction: 'high' | 'low',
): OpponentInsightItem | null {
  return pickOpponentRankedList(entries, direction, 1)[0] ?? null;
}

function buildStadiumOpponentStats(
  records: AttendanceRecord[],
  favoriteTeamId: number,
) {
  const stadiumOpponentStats = new Map<number, OpponentAccumulator>();

  for (const record of records) {
    if (record.viewerRelation !== 'owner' || record.watchType !== 'stadium') {
      continue;
    }

    if (!countsTowardWinRate(record.game, favoriteTeamId)) {
      continue;
    }

    const opponent = getOpponentTeamId(record, favoriteTeamId);

    if (!opponent) {
      continue;
    }

    const teamOutcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (!teamOutcome) {
      continue;
    }

    const stadiumCurrent = stadiumOpponentStats.get(opponent.id) ?? {
      teamId: opponent.id,
      shortName: opponent.shortName,
      wins: 0,
      losses: 0,
      draws: 0,
      decided: 0,
    };
    applyOutcomeToAccumulator(stadiumCurrent, teamOutcome);
    stadiumOpponentStats.set(opponent.id, stadiumCurrent);
  }

  return [...stadiumOpponentStats.values()];
}

export function getStadiumAttendanceOpponentInsights(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): OpponentInsightRankings {
  if (!favoriteTeamId) {
    return { high: [], low: [] };
  }

  const stadiumEntries = buildStadiumOpponentStats(records, favoriteTeamId);

  return {
    high: pickOpponentRankedList(stadiumEntries, 'high'),
    low: pickOpponentRankedList(stadiumEntries, 'low'),
  };
}
