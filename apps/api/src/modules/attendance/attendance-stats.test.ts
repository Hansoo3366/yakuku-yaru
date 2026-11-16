import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeAttendanceStats,
  getKoreaYearRange,
  type AttendanceStatsRecord,
} from './attendance-stats.js';
import { planAttendanceReconcile } from './attendance-reconcile.js';

const LG = 1;
const DOOSAN = 2;
const KIA = 3;
const SAMSUNG = 4;

let nextGameId = 1;

/** 한국 시간 벽시계로 경기 시각을 만든다. */
function kst(value: string) {
  return new Date(`${value}+09:00`);
}

function record(
  input: {
    home?: number;
    away?: number;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string;
    watchType?: 'stadium' | 'home';
    stadium?: string;
    gameDate?: Date;
    gameId?: number;
    viewerRelation?: 'owner' | 'companion';
    cheeredTeamId?: number | null;
    viewerCheeredTeamId?: number | null;
    ownerFavoriteTeamId?: number | null;
    result?: string | null;
  } = {},
): AttendanceStatsRecord {
  const status = input.status ?? 'finished';
  const cancelled = status === 'cancelled';

  return {
    gameId: input.gameId ?? nextGameId++,
    watchType: input.watchType ?? 'stadium',
    viewerRelation: input.viewerRelation ?? 'owner',
    cheeredTeamId: input.cheeredTeamId ?? null,
    viewerCheeredTeamId: input.viewerCheeredTeamId ?? null,
    ownerFavoriteTeamId: input.ownerFavoriteTeamId ?? LG,
    myTeamScore: null,
    opponentScore: null,
    result: input.result ?? null,
    game: {
      gameDate: input.gameDate ?? kst('2025-05-01T18:30:00'),
      stadium: input.stadium ?? '잠실야구장',
      status,
      homeTeam: { id: input.home ?? LG },
      awayTeam: { id: input.away ?? DOOSAN },
      homeScore: cancelled ? null : (input.homeScore ?? 5),
      awayScore: cancelled ? null : (input.awayScore ?? 3),
    },
  };
}

void test('같은 경기 기록이 둘이면 직관·내 기록을 우선해 한 번만 센다', () => {
  const stats = computeAttendanceStats(
    [
      record({ gameId: 10, watchType: 'home' }),
      record({ gameId: 10, watchType: 'stadium', viewerRelation: 'companion' }),
      record({ gameId: 11, watchType: 'home', viewerRelation: 'companion' }),
      record({ gameId: 11, watchType: 'home' }),
    ],
    LG,
  );

  assert.equal(stats.totalCount, 2);
  assert.equal(stats.stadiumCount, 1);
  assert.equal(stats.homeCount, 1);
});

void test('승률은 응원팀 경기만, 전체 성적은 중립 경기도 그날 응원 팀 기준으로 센다', () => {
  const stats = computeAttendanceStats(
    [
      // LG 승 (직관)
      record({ homeScore: 5, awayScore: 3 }),
      // LG 패 (집관)
      record({ watchType: 'home', homeScore: 1, awayScore: 4 }),
      // 중립 경기: KIA 응원, KIA 승
      record({
        home: KIA,
        away: SAMSUNG,
        homeScore: 7,
        awayScore: 2,
        cheeredTeamId: KIA,
      }),
      // LG 경기 우천취소
      record({ status: 'cancelled' }),
    ],
    LG,
  );

  assert.equal(stats.totalCount, 4);
  assert.deepEqual(
    [stats.winCount, stats.loseCount, stats.drawCount, stats.winRate],
    [1, 1, 0, 50],
  );
  assert.deepEqual(
    [stats.overallWinCount, stats.overallLoseCount, stats.overallWinRate],
    [2, 1, 66.7],
  );
  assert.deepEqual(
    [stats.overallStadiumWinCount, stats.overallStadiumLoseCount],
    [2, 0],
  );
  assert.equal(stats.overallHomeLoseCount, 1);
  assert.equal(stats.favoriteTeamStadiumCount, 2);
  assert.equal(stats.favoriteTeamStadiumWinCount, 1);
  assert.equal(stats.overallCancelledCount, 1);
  assert.equal(stats.favoriteTeamStadiumCancelledCount, 1);
  // 취소 경기는 승률 집계 대상이 아니다.
  assert.equal(stats.stadiumWinRate, 100);
  assert.equal(stats.homeWinRate, 0);
});

void test('동행 기록은 내 응원팀 기준으로 승패를 본다', () => {
  // 기록 주인은 두산 팬이지만 나는 LG 팬. LG 가 이겼다.
  const stats = computeAttendanceStats(
    [
      record({
        viewerRelation: 'companion',
        ownerFavoriteTeamId: DOOSAN,
        homeScore: 6,
        awayScore: 2,
      }),
    ],
    LG,
  );

  assert.equal(stats.winCount, 1);
  assert.equal(stats.loseCount, 0);
});

void test('응원팀이 없으면 승률 집계 대상이 없다', () => {
  const stats = computeAttendanceStats([record(), record()], null);

  assert.equal(stats.totalCount, 2);
  assert.equal(stats.winRate, 0);
  assert.equal(stats.winCount + stats.loseCount + stats.drawCount, 0);
});

void test('명예타이틀: 승리요정·지박령·케네디 스코어·연패', () => {
  const wins = computeAttendanceStats(
    [
      record({ homeScore: 8, awayScore: 7 }),
      record({ homeScore: 3, awayScore: 1 }),
      record({ homeScore: 4, awayScore: 2 }),
      record({ homeScore: 2, awayScore: 1 }),
      record({ homeScore: 6, awayScore: 0 }),
    ],
    LG,
  );
  const keys = wins.titles.map((title) => title.key);

  assert.ok(keys.includes('victory-totem'));
  assert.ok(keys.includes('win-fairy'));
  assert.ok(keys.includes('kennedy-score-mania'));
  assert.ok(keys.includes('stadium-ghost'));
  assert.equal(
    wins.titles.find((title) => title.key === 'stadium-ghost')?.label,
    '잠실 지박령',
  );
  assert.equal(wins.title, wins.titles[0]?.label);

  const losses = computeAttendanceStats(
    [
      record({ gameDate: kst('2025-05-01T18:30:00'), homeScore: 1, awayScore: 2 }),
      record({ gameDate: kst('2025-05-02T18:30:00'), status: 'cancelled' }),
      record({ gameDate: kst('2025-05-03T18:30:00'), homeScore: 0, awayScore: 12 }),
      record({ gameDate: kst('2025-05-04T18:30:00'), homeScore: 2, awayScore: 3 }),
    ],
    LG,
  );
  const lossKeys = losses.titles.map((title) => title.key);

  // 취소 경기는 연패를 끊지 않는다.
  assert.ok(lossKeys.includes('i-am-happy'));
  assert.ok(lossKeys.includes('are-you-pro'));
  assert.ok(lossKeys.includes('loss-fairy'));
});

void test('보살 타이틀은 서버 시간대와 관계없이 한국 시간 7~8월 오후 2시 경기', () => {
  const summerDay = computeAttendanceStats(
    [record({ gameDate: kst('2025-07-20T14:00:00') })],
    LG,
  );
  const summerNight = computeAttendanceStats(
    [record({ gameDate: kst('2025-07-20T18:30:00') })],
    LG,
  );

  assert.ok(summerDay.titles.some((title) => title.key === 'summer-saint'));
  assert.ok(!summerNight.titles.some((title) => title.key === 'summer-saint'));
});

void test('기본 기간은 한국 시간 기준 올해', () => {
  // UTC 12월 31일 16시 = 한국 1월 1일 01시
  assert.deepEqual(getKoreaYearRange(new Date('2025-12-31T16:00:00Z')), {
    from: '2026-01-01',
    to: '2027-01-01',
  });
  assert.deepEqual(getKoreaYearRange(new Date('2025-12-31T14:59:00Z')), {
    from: '2025-01-01',
    to: '2026-01-01',
  });
});

void test('저장 스코어 정리: 취소·공식 스코어·변경 없음', () => {
  const base = {
    myTeamScore: null,
    opponentScore: null,
    result: null,
    isScoreModified: false,
    ownerFavoriteTeamId: LG,
    cheeredTeamId: null,
  };
  const finished = {
    gameDate: kst('2020-05-01T18:30:00'),
    stadium: '잠실야구장',
    status: 'finished',
    homeTeam: { id: LG, name: 'LG 트윈스', shortName: 'LG' },
    awayTeam: { id: DOOSAN, name: '두산 베어스', shortName: '두산' },
    homeScore: 2,
    awayScore: 5,
    cancellationReason: null,
  };

  assert.deepEqual(
    planAttendanceReconcile({
      ...base,
      result: 'win',
      game: { ...finished, status: 'cancelled', homeScore: null, awayScore: null },
    }),
    { kind: 'scores', myTeamScore: null, opponentScore: null, result: null },
  );
  assert.deepEqual(planAttendanceReconcile({ ...base, game: finished }), {
    kind: 'scores',
    myTeamScore: 2,
    opponentScore: 5,
    result: 'lose',
  });
  assert.deepEqual(
    planAttendanceReconcile({
      ...base,
      myTeamScore: 2,
      opponentScore: 5,
      result: 'lose',
      game: finished,
    }),
    { kind: 'none' },
  );
});
