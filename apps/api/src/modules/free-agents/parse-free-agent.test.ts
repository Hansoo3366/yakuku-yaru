import assert from 'node:assert/strict';
import {
  getKoreaDateKey,
  getStoveLeagueYear,
  isContractInStoveLeague,
  parseKboTradeRows,
  pickFreeAgentPlayer,
} from './parse-free-agent.js';

const cell = (Text: string) => ({ Text });

const rows = parseKboTradeRows({
  rows: [
    { row: ['2025-12-05', 'FA 계약', '삼성', '최형우(외야수)', ''].map(cell) },
    {
      row: ['2025-11-08', 'FA 자격취득', 'KIA', '최원준 (투수)', ''].map(cell),
    },
    { row: ['날짜', '항목', '팀', '선수', '비고'].map(cell) },
    { row: ['2025-11-08', 'FA 자격취득', 'KIA', '포지션없음', ''].map(cell) },
  ],
});

assert.deepEqual(rows, [
  {
    date: '2025-12-05',
    section: 'FA 계약',
    teamShortName: '삼성',
    playerName: '최형우',
    position: '외야수',
  },
  {
    date: '2025-11-08',
    section: 'FA 자격취득',
    teamShortName: 'KIA',
    playerName: '최원준',
    position: '투수',
  },
]);

assert.equal(getStoveLeagueYear('2026-11-17'), 2026);
assert.equal(getStoveLeagueYear('2027-02-01'), 2026);
assert.equal(getStoveLeagueYear('2026-07-01'), null);

// 2025 스토브리그: 2025-11-08 공시 → 2026년 10월까지 계약
assert.equal(isContractInStoveLeague('2025-12-05', 2025, '2025-11-08'), true);
assert.equal(isContractInStoveLeague('2026-02-09', 2025, '2025-11-08'), true);
assert.equal(isContractInStoveLeague('2025-01-13', 2025, '2025-11-08'), false);
assert.equal(isContractInStoveLeague('2026-11-20', 2025, '2025-11-08'), false);

// UTC 10월 31일 오후 3시는 한국 11월 1일 0시
assert.equal(getKoreaDateKey(new Date('2026-10-31T15:00:00Z')), '2026-11-01');

// 포지션 그룹: 외야수 FA ↔ 좌익수 선수, 지명타자는 야수와 맞음, 투수와는 안 맞음
const choi = [
  { id: 1, position: '투수', teamId: 5, isActive: true },
  { id: 2, position: '중견수', teamId: 9, isActive: true },
];
assert.equal(
  pickFreeAgentPlayer({ position: '외야수', teamIds: [8, 9] }, choi),
  2,
);
assert.equal(
  pickFreeAgentPlayer({ position: '투수', teamIds: [5, 5] }, choi),
  1,
);
assert.equal(
  pickFreeAgentPlayer({ position: '포수', teamIds: [7, null] }, [
    { id: 3, position: '지명타자', teamId: 2, isActive: true },
  ]),
  3,
);
// 팀이 다르고 같은 포지션 동명이인이 둘이면 고르지 않는다
assert.equal(
  pickFreeAgentPlayer({ position: '내야수', teamIds: [1, null] }, [
    { id: 4, position: '유격수', teamId: 2, isActive: true },
    { id: 5, position: '2루수', teamId: 3, isActive: true },
  ]),
  null,
);

console.log('parse-free-agent.test.ts: ok');
