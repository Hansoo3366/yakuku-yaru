import type { AttendanceRecord } from '@/lib/attendance-api';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import { getFavoriteTeamGameOutcome, type GameOutcome } from '@/lib/game-outcome';

export type WinRateSnapshot = {
  rate: number | null;
  decidedCount: number;
};

function isDecidedTeamOutcome(
  outcome: GameOutcome,
): outcome is 'win' | 'lose' | 'draw' {
  return outcome === 'win' || outcome === 'lose' || outcome === 'draw';
}

function formatWinRate(rate: number | null) {
  if (rate === null) {
    return '—';
  }

  return `${rate}%`;
}

export function formatWinRateLabel(snapshot: WinRateSnapshot) {
  return formatWinRate(snapshot.rate);
}

function getAttendanceWinRateByWatchType(
  records: AttendanceRecord[],
  watchType: 'stadium' | 'home',
  favoriteTeamId: number | null | undefined,
): WinRateSnapshot {
  const filtered = records.filter(
    (record) =>
      record.viewerRelation === 'owner' && record.watchType === watchType,
  );
  const decided = filtered
    .map((record) => resolveAttendanceOutcome(record, favoriteTeamId))
    .filter((result): result is 'win' | 'lose' | 'draw' => result !== null);

  if (!decided.length) {
    return { rate: null, decidedCount: 0 };
  }

  const wins = decided.filter((result) => result === 'win').length;

  return {
    rate: Math.round((wins / decided.length) * 100),
    decidedCount: decided.length,
  };
}

export function getStadiumAttendanceWinRate(
  records: AttendanceRecord[],
  favoriteTeamId?: number | null,
): WinRateSnapshot {
  return getAttendanceWinRateByWatchType(records, 'stadium', favoriteTeamId);
}

export function getHomeAttendanceWinRate(
  records: AttendanceRecord[],
  favoriteTeamId?: number | null,
): WinRateSnapshot {
  return getAttendanceWinRateByWatchType(records, 'home', favoriteTeamId);
}

export function getFavoriteTeamWinRate(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): WinRateSnapshot {
  if (!favoriteTeamId) {
    return { rate: null, decidedCount: 0 };
  }

  const outcomes = records
    .filter((record) => record.viewerRelation === 'owner')
    .map((record) =>
      getFavoriteTeamGameOutcome(record.game, favoriteTeamId, record.result),
    )
    .filter(isDecidedTeamOutcome);

  if (!outcomes.length) {
    return { rate: null, decidedCount: 0 };
  }

  const wins = outcomes.filter((outcome) => outcome === 'win').length;

  return {
    rate: Math.round((wins / outcomes.length) * 100),
    decidedCount: outcomes.length,
  };
}
