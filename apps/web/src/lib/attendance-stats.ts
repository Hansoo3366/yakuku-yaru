import type { AttendanceRecord, AttendanceStats } from '@/lib/attendance-api';
import {
  resolveAttendanceOutcome,
  resolveAttendanceTitle,
} from '@/lib/attendance-score';

/** 메인 등 클라이언트 표시용 — KBO 공식 스코어 기준 승패·승률·타이틀 */
export function computeAttendanceStatsFromRecords(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): AttendanceStats {
  const owned = records.filter((record) => record.viewerRelation === 'owner');
  let stadiumCount = 0;
  let homeCount = 0;
  let winCount = 0;
  let loseCount = 0;
  let drawCount = 0;
  let stadiumWinCount = 0;
  let homeWinCount = 0;

  for (const record of owned) {
    if (record.watchType === 'stadium') {
      stadiumCount += 1;
    } else if (record.watchType === 'home') {
      homeCount += 1;
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

  const totalCount = owned.length;
  const winRate = totalCount ? Math.round((winCount / totalCount) * 1000) / 10 : 0;
  const stadiumWinRate = stadiumCount
    ? Math.round((stadiumWinCount / stadiumCount) * 1000) / 10
    : 0;
  const homeWinRate = homeCount
    ? Math.round((homeWinCount / homeCount) * 1000) / 10
    : 0;

  return {
    totalCount,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: resolveAttendanceTitle(totalCount, winRate),
  };
}
