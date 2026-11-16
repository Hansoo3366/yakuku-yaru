import {
  countsTowardWinRateForRecord,
  isTeamInGame,
} from './attendance-game.js';
import {
  resolveAttendanceOutcome,
  resolveAttendanceTitle,
  resolveAttendanceTitles,
  type AttendanceRecordForOutcome,
} from './attendance-score.js';

/**
 * 직관 통계·명예타이틀 계산. DB 를 읽지 않는 순수 함수만 둔다.
 * 웹은 이 결과를 /attendance-records/stats/me 로 받아 그대로 보여 준다.
 */

export type AttendanceStatsRecord = AttendanceRecordForOutcome & {
  gameId: number;
  watchType: string;
  viewerRelation: 'owner' | 'companion';
  game: AttendanceRecordForOutcome['game'] & {
    gameDate: Date | string;
    stadium: string;
  };
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 한국 시간 기준 그해 1월 1일 ~ 이듬해 1월 1일 (끝은 포함하지 않음) */
export function getKoreaYearRange(base = new Date()) {
  const year = new Date(base.getTime() + KST_OFFSET_MS).getUTCFullYear();

  return {
    from: `${year}-01-01`,
    to: `${year + 1}-01-01`,
  };
}

/** 서버 시간대와 관계없이 경기 시각을 한국 시간 월·시로 읽는다. */
function getKoreaMonthAndHour(value: Date | string) {
  const shifted = new Date(new Date(value).getTime() + KST_OFFSET_MS);

  return {
    month: shifted.getUTCMonth() + 1,
    hour: shifted.getUTCHours(),
  };
}

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

function byGameDate(a: AttendanceStatsRecord, b: AttendanceStatsRecord) {
  return (
    new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime()
  );
}

/** 같은 경기에 기록이 둘이면(내 기록 + 동행 기록) 직관 > 집관, 내 기록 > 동행 순으로 하나만 센다. */
function getStatsPriority(record: AttendanceStatsRecord) {
  return (
    (record.watchType === 'stadium' ? 4 : 0) +
    (record.viewerRelation === 'owner' ? 2 : 0)
  );
}

export function dedupeAttendanceRecordsByGame<T extends AttendanceStatsRecord>(
  records: T[],
) {
  const byGame = new Map<number, T>();

  for (const record of records) {
    const previous = byGame.get(record.gameId);

    if (!previous || getStatsPriority(record) > getStatsPriority(previous)) {
      byGame.set(record.gameId, record);
    }
  }

  return [...byGame.values()].sort(byGameDate);
}

function calculateWinRate(win: number, lose: number, draw: number) {
  const total = win + lose + draw;

  return total ? Math.round((win / total) * 1000) / 10 : 0;
}

type Tally = { win: number; lose: number; draw: number };

function emptyTally(): Tally {
  return { win: 0, lose: 0, draw: 0 };
}

function addOutcome(tally: Tally, outcome: 'win' | 'lose' | 'draw' | null) {
  if (outcome) {
    tally[outcome] += 1;
  }
}

function getAttendanceTitleMetrics(
  records: AttendanceStatsRecord[],
  favoriteTeamId: number | null,
) {
  const stadiumRecords = records
    .filter((record) => record.watchType === 'stadium')
    .sort(byGameDate);
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
    const { game } = record;
    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);
    stadiumCounts.set(game.stadium, (stadiumCounts.get(game.stadium) ?? 0) + 1);

    if (game.stadium.includes('고척') || game.stadium.includes('스카이돔')) {
      domeStadiumCount += 1;
    }

    if (game.status === 'cancelled') {
      cancelledCount += 1;
    }

    const { month, hour } = getKoreaMonthAndHour(game.gameDate);

    if ((month === 7 || month === 8) && hour === 14) {
      summerDayGameCount += 1;
    }

    if (favoriteTeamId && game.homeTeam.id === favoriteTeamId) {
      homeStadiumCount += 1;
    } else if (favoriteTeamId && game.awayTeam.id === favoriteTeamId) {
      awayStadiumCount += 1;
    }

    // 연패: 승·무가 끊고, 결과 없는 경기(취소·미입력)는 건너뛴다.
    if (outcome === 'lose') {
      currentLosingStreak += 1;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosingStreak);
    } else if (outcome === 'win' || outcome === 'draw') {
      currentLosingStreak = 0;
    }

    const { homeScore, awayScore } = game;

    if (homeScore === null || awayScore === null) {
      continue;
    }

    const scoreDiff = Math.abs(homeScore - awayScore);
    const low = Math.min(homeScore, awayScore);
    const high = Math.max(homeScore, awayScore);

    if (scoreDiff === 1) {
      oneRunGameCount += 1;
    }

    if (low === 7 && high === 8) {
      kennedyScoreCount += 1;
    }

    if ((low === 0 && high === 1) || (low === 0 && high === 0)) {
      pitcherDuelCount += 1;
    }

    if (outcome === 'lose' && scoreDiff >= 10) {
      doubleDigitLossCount += 1;
    }
  }

  // 같은 횟수면 먼저 간 구장 (Map 은 넣은 순서를 지키고 sort 는 안정 정렬)
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

/**
 * 기록 목록(내 기록 + 수락한 동행 기록)으로 통계를 만든다.
 * - total/stadium/home·overall*: 같은 경기는 한 번만, 응원팀이 안 뛴 경기(중립)·취소 경기도 센다.
 *   중립 경기 승패는 그날 응원한 팀 기준.
 * - win/lose/draw·winRate: 내 응원팀이 뛴 경기만 (취소 제외). 타이틀의 승률도 이 값.
 */
export function computeAttendanceStats(
  records: AttendanceStatsRecord[],
  favoriteTeamId: number | null,
) {
  const unique = dedupeAttendanceRecordsByGame(records);
  const overall = emptyTally();
  const overallStadium = emptyTally();
  const overallHome = emptyTally();
  const favoriteStadium = emptyTally();
  const countable = emptyTally();
  let stadiumCount = 0;
  let homeCount = 0;
  let favoriteTeamStadiumCount = 0;
  let overallCancelledCount = 0;
  let overallStadiumCancelledCount = 0;
  let overallHomeCancelledCount = 0;
  let favoriteTeamStadiumCancelledCount = 0;
  let countableStadium = 0;
  let countableHome = 0;
  let stadiumWinCount = 0;
  let homeWinCount = 0;

  for (const record of unique) {
    const isStadium = record.watchType === 'stadium';
    const isHome = record.watchType === 'home';
    const isFavoriteTeamStadium =
      isStadium && Boolean(favoriteTeamId) && isTeamInGame(record.game, favoriteTeamId);
    const cancelled = record.game.status === 'cancelled';
    const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

    if (isStadium) stadiumCount += 1;
    if (isHome) homeCount += 1;
    if (isFavoriteTeamStadium) favoriteTeamStadiumCount += 1;

    if (cancelled) {
      overallCancelledCount += 1;
      if (isStadium) overallStadiumCancelledCount += 1;
      if (isHome) overallHomeCancelledCount += 1;
      if (isFavoriteTeamStadium) favoriteTeamStadiumCancelledCount += 1;
    }

    addOutcome(overall, outcome);
    if (isStadium) addOutcome(overallStadium, outcome);
    if (isHome) addOutcome(overallHome, outcome);
    if (isFavoriteTeamStadium) addOutcome(favoriteStadium, outcome);

    if (!countsTowardWinRateForRecord({ game: record.game, favoriteTeamId })) {
      continue;
    }

    if (isStadium) countableStadium += 1;
    if (isHome) countableHome += 1;
    addOutcome(countable, outcome);

    if (outcome === 'win') {
      if (isStadium) stadiumWinCount += 1;
      if (isHome) homeWinCount += 1;
    }
  }

  const winRate = calculateWinRate(countable.win, countable.lose, countable.draw);
  // 무·결과 미입력도 분모에 넣는 옛 방식. 화면은 overall*WinRate 를 먼저 쓴다.
  const stadiumWinRate = countableStadium
    ? Math.round((stadiumWinCount / countableStadium) * 1000) / 10
    : 0;
  const homeWinRate = countableHome
    ? Math.round((homeWinCount / countableHome) * 1000) / 10
    : 0;
  const titles = resolveAttendanceTitles({
    totalCount: unique.length,
    stadiumCount,
    homeCount,
    winCount: countable.win,
    loseCount: countable.lose,
    drawCount: countable.draw,
    winRate,
    ...getAttendanceTitleMetrics(unique, favoriteTeamId),
  });
  const decidedCountable = countable.win + countable.lose + countable.draw;

  return {
    totalCount: unique.length,
    stadiumCount,
    homeCount,
    winCount: countable.win,
    loseCount: countable.lose,
    drawCount: countable.draw,
    overallWinCount: overall.win,
    overallLoseCount: overall.lose,
    overallDrawCount: overall.draw,
    overallWinRate: calculateWinRate(overall.win, overall.lose, overall.draw),
    overallStadiumWinCount: overallStadium.win,
    overallStadiumLoseCount: overallStadium.lose,
    overallStadiumDrawCount: overallStadium.draw,
    overallStadiumWinRate: calculateWinRate(
      overallStadium.win,
      overallStadium.lose,
      overallStadium.draw,
    ),
    overallHomeWinCount: overallHome.win,
    overallHomeLoseCount: overallHome.lose,
    overallHomeDrawCount: overallHome.draw,
    overallHomeWinRate: calculateWinRate(
      overallHome.win,
      overallHome.lose,
      overallHome.draw,
    ),
    favoriteTeamStadiumCount,
    favoriteTeamWinCount: countable.win,
    favoriteTeamLoseCount: countable.lose,
    favoriteTeamDrawCount: countable.draw,
    favoriteTeamStadiumWinCount: favoriteStadium.win,
    favoriteTeamStadiumLoseCount: favoriteStadium.lose,
    favoriteTeamStadiumDrawCount: favoriteStadium.draw,
    favoriteTeamStadiumWinRate: calculateWinRate(
      favoriteStadium.win,
      favoriteStadium.lose,
      favoriteStadium.draw,
    ),
    overallCancelledCount,
    overallStadiumCancelledCount,
    overallHomeCancelledCount,
    favoriteTeamStadiumCancelledCount,
    winRate,
    stadiumWinRate,
    homeWinRate,
    title: titles[0]?.label ?? resolveAttendanceTitle(decidedCountable, winRate),
    titles,
  };
}

export type AttendanceStats = ReturnType<typeof computeAttendanceStats>;
