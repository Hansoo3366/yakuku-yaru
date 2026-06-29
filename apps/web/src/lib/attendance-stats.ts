import type { AttendanceRecord, AttendanceStats } from '@/lib/attendance-api';
import {
  countsTowardWinRateForRecord,
  isTeamInGame,
} from '@/lib/attendance-game';
import {
  resolveAttendanceOutcome,
  resolveAttendanceTitle,
  resolveAttendanceTitles,
} from '@/lib/attendance-score';

function getStadiumTitleName(stadium: string) {
  if (stadium.includes('잠실')) return '잠실';
  if (stadium.includes('고척')) return '고척돔';
  if (stadium.includes('광주') || stadium.includes('챔피언스')) return '챔필';
  if (stadium.includes('대구')) return '라팍';
  if (stadium.includes('대전')) return '대전';
  if (stadium.includes('사직')) return '사직';
  if (stadium.includes('창원')) return '창원NC파크';
  if (stadium.includes('수원')) return '수원';
  if (stadium.includes('문학') || stadium.includes('랜더스')) return '문학';
  return stadium.replace(/야구장|구장|스타디움/g, '').trim() || stadium;
}

function getAttendanceRecordStatsPriority(record: AttendanceRecord) {
  let priority = 0;

  if (record.watchType === 'stadium') {
    priority += 4;
  }

  if (record.viewerRelation === 'owner') {
    priority += 2;
  }

  return priority;
}

function dedupeAttendanceRecordsByGame(records: AttendanceRecord[]) {
  const byGame = new Map<number, AttendanceRecord>();

  for (const record of records) {
    const previous = byGame.get(record.gameId);

    if (
      !previous ||
      getAttendanceRecordStatsPriority(record) >
        getAttendanceRecordStatsPriority(previous)
    ) {
      byGame.set(record.gameId, record);
    }
  }

  return [...byGame.values()].sort(
    (a, b) =>
      new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime(),
  );
}

function getAttendanceTitleMetrics(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
) {
  const stadiumRecords = records.filter((record) => record.watchType === 'stadium');
  const stadiumCounts = new Map<string, number>();
  let domeStadiumCount = 0;
  let cancelledCount = 0;
  let oneRunGameCount = 0;
  let kennedyScoreCount = 0;
  let pitcherDuelCount = 0;
  let doubleDigitLossCount = 0;
  let homeStadiumCount = 0;
  let awayStadiumCount = 0;
  let summerDayGameCount = 0;
  let currentLosingStreak = 0;
  let maxLosingStreak = 0;

  for (const record of stadiumRecords) {
    const stadium = record.game.stadium;
    stadiumCounts.set(stadium, (stadiumCounts.get(stadium) ?? 0) + 1);

    if (stadium.includes('고척') || stadium.includes('스카이돔')) {
      domeStadiumCount += 1;
    }

    if (record.game.status === 'cancelled') {
      cancelledCount += 1;
    }

    const gameDate = new Date(record.game.gameDate);
    const month = gameDate.getMonth() + 1;
    const hour = gameDate.getHours();

    if ((month === 7 || month === 8) && hour === 14) {
      summerDayGameCount += 1;
    }

    if (favoriteTeamId && record.game.homeTeam.id === favoriteTeamId) {
      homeStadiumCount += 1;
    } else if (favoriteTeamId && record.game.awayTeam.id === favoriteTeamId) {
      awayStadiumCount += 1;
    }

    const homeScore = record.game.homeScore;
    const awayScore = record.game.awayScore;

    if (homeScore === null || awayScore === null) {
      continue;
    }

    const scoreDiff = Math.abs(homeScore - awayScore);

    if (scoreDiff === 1) {
      oneRunGameCount += 1;
    }

    if (
      (homeScore === 8 && awayScore === 7) ||
      (homeScore === 7 && awayScore === 8)
    ) {
      kennedyScoreCount += 1;
    }

    if (
      (homeScore === 1 && awayScore === 0) ||
      (homeScore === 0 && awayScore === 1) ||
      (homeScore === 0 && awayScore === 0)
    ) {
      pitcherDuelCount += 1;
    }

    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (outcome === 'lose' && scoreDiff >= 10) {
      doubleDigitLossCount += 1;
    }
  }

  for (const record of [...stadiumRecords].sort(
    (a, b) =>
      new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime(),
  )) {
    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (outcome === 'lose') {
      currentLosingStreak += 1;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
    } else if (outcome === 'win' || outcome === 'draw') {
      currentLosingStreak = 0;
    }
  }

  const dominant = [...stadiumCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    awayStadiumCount,
    homeStadiumCount,
    cancelledCount,
    domeStadiumCount,
    distinctStadiumCount: stadiumCounts.size,
    dominantStadiumName: dominant ? getStadiumTitleName(dominant[0]) : null,
    dominantStadiumRatio:
      dominant && stadiumRecords.length ? dominant[1] / stadiumRecords.length : 0,
    oneRunGameCount,
    kennedyScoreCount,
    pitcherDuelCount,
    doubleDigitLossCount,
    maxLosingStreak,
    summerDayGameCount,
  };
}

/** 메인 등 클라이언트 표시용 — 중립 제외, 동행(내 팀 경기) 포함 */
export function computeAttendanceStatsFromRecords(
  records: AttendanceRecord[],
  favoriteTeamId: number | null | undefined,
): AttendanceStats {
  const statsRecords = dedupeAttendanceRecordsByGame(
    records.filter(
      (record) =>
        record.viewerRelation === 'owner' ||
        record.viewerRelation === 'companion',
    ),
  );
  const countable = statsRecords.filter((record) =>
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
  let overallWinCount = 0;
  let overallLoseCount = 0;
  let overallDrawCount = 0;
  let favoriteTeamStadiumCount = 0;
  let favoriteTeamWinCount = 0;
  let favoriteTeamLoseCount = 0;
  let favoriteTeamDrawCount = 0;
  let stadiumWinCount = 0;
  let homeWinCount = 0;
  let countableStadium = 0;
  let countableHome = 0;

  for (const record of statsRecords) {
    if (record.watchType === 'stadium') {
      stadiumCount += 1;
    } else if (record.watchType === 'home') {
      homeCount += 1;
    }

    if (favoriteTeamId && isTeamInGame(record.game, favoriteTeamId)) {
      if (record.watchType === 'stadium') {
        favoriteTeamStadiumCount += 1;
      }
    }

    const overallOutcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (overallOutcome === 'win') {
      overallWinCount += 1;
    } else if (overallOutcome === 'lose') {
      overallLoseCount += 1;
    } else if (overallOutcome === 'draw') {
      overallDrawCount += 1;
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
      favoriteTeamWinCount += 1;
      if (record.watchType === 'stadium') {
        stadiumWinCount += 1;
      } else if (record.watchType === 'home') {
        homeWinCount += 1;
      }
    } else if (outcome === 'lose') {
      loseCount += 1;
      favoriteTeamLoseCount += 1;
    } else {
      drawCount += 1;
      favoriteTeamDrawCount += 1;
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

  const titleMetrics = getAttendanceTitleMetrics(statsRecords, favoriteTeamId);
  const titles = resolveAttendanceTitles({
    totalCount: statsRecords.length,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    winRate,
    ...titleMetrics,
  });

  return {
    totalCount: statsRecords.length,
    stadiumCount,
    homeCount,
    winCount,
    loseCount,
    drawCount,
    overallWinCount,
    overallLoseCount,
    overallDrawCount,
    favoriteTeamStadiumCount,
    favoriteTeamWinCount,
    favoriteTeamLoseCount,
    favoriteTeamDrawCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: titles[0]?.label ?? resolveAttendanceTitle(decidedCountable, winRate),
    titles,
  };
}
