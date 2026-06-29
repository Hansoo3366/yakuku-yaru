import type { AttendanceRecord, AttendanceStats } from '@/lib/attendance-api';
import { countsTowardWinRateForRecord } from '@/lib/attendance-game';
import {
  resolveAttendanceOutcome,
  resolveAttendanceTitle,
} from '@/lib/attendance-score';

/** 메인 등 클라이언트 표시용 — 중립 제외, 동행(내 팀 경기) 포함 */
export function computeAttendanceStatsFromRecords(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): AttendanceStats {
  const owned = records.filter((record) => record.viewerRelation === 'owner');
  const countable = records.filter((record) =>
    countsTowardWinRateForRecord({
      game: record.game,
      favoriteTeamId,
      cheeredTeamId: record.cheeredTeamId ?? null,
      viewerCheeredTeamId: record.viewerCheeredTeamId ?? null,
      viewerRelation: record.viewerRelation,
      ownerFavoriteTeamId: record.ownerFavoriteTeamId ?? null,
    }),
  );

  let stadiumCount = 0;
  let homeCount = 0;
  let winCount = 0;
  let loseCount = 0;
  let drawCount = 0;
  let stadiumWinCount = 0;
  let homeWinCount = 0;
  let countableStadium = 0;
  let countableHome = 0;

  for (const record of owned) {
    if (record.watchType === 'stadium') {
      stadiumCount += 1;
    } else if (record.watchType === 'home') {
      homeCount += 1;
    }
  }

  for (const record of countable) {
    if (record.watchType === 'stadium') {
      countableStadium += 1;
    } else if (record.watchType === 'home') {
      countableHome += 1;
    }

    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (!outcome) {
      continue;
    }

    if (outcome === 'win') {
      winCount += 1;
      if (record.watchType === 'stadium') {
        stadiumWinCount += 1;
      } else if (record.watchType === 'home') {
        homeWinCount += 1;
      }
    } else if (outcome === 'lose') {
      loseCount += 1;
    } else {
      drawCount += 1;
    }
  }

  const decidedCountable = winCount + loseCount + drawCount;
  const winRate = decidedCountable
    ? Math.round((winCount / decidedCountable) * 1000) / 10
    : 0;
  const stadiumWinRate = countableStadium
    ? Math.round((stadiumWinCount / countableStadium) * 1000) / 10
    : 0;
  const homeWinRate = countableHome
    ? Math.round((homeWinCount / countableHome) * 1000) / 10
    : 0;

  return {
    totalCount: owned.length,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: resolveAttendanceTitle(decidedCountable, winRate),
  };
}
