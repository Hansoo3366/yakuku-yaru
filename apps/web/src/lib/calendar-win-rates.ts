import type { AttendanceRecord } from '@/lib/attendance-api';
import { countsTowardWinRate } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';

export type WinRateSnapshot = {
  rate: number | null;
  decidedCount: number;
};

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
      record.watchType === watchType &&
      countsTowardWinRate(record.game, favoriteTeamId),
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
