import assert from 'node:assert/strict';
import type { ParsedKboPlayer } from '../kbo-players/parse-player-search.js';
import { resolveLineupPlayerSearchMatches } from './lineup-player-match.js';

function player(
  input: Pick<
    ParsedKboPlayer,
    'kboPlayerId' | 'name' | 'teamShortName' | 'isRetired'
  >,
): ParsedKboPlayer {
  return {
    ...input,
    backNumber: null,
    birthDate: null,
    heightCm: null,
    position: null,
    profileUrl: null,
    school: null,
    weightKg: null,
  };
}

const retired = player({
  isRetired: true,
  kboPlayerId: '10001',
  name: '동명이인',
  teamShortName: '한화',
});
const active = player({
  isRetired: false,
  kboPlayerId: '20002',
  name: '동명이인',
  teamShortName: '한화',
});

const resolved = resolveLineupPlayerSearchMatches({
  matches: [retired, active],
  name: '동명이인',
  teamShortName: '한화',
});

assert.equal(resolved.activeMatch?.kboPlayerId, '20002');
assert.deepEqual(
  resolved.retiredMatches.map((match) => match.kboPlayerId),
  ['10001'],
);

const ambiguous = resolveLineupPlayerSearchMatches({
  matches: [
    active,
    player({
      isRetired: false,
      kboPlayerId: '30003',
      name: '동명이인',
      teamShortName: '한화',
    }),
  ],
  name: '동명이인',
  teamShortName: '한화',
});

assert.equal(ambiguous.activeMatch, null);

const samsungPitcher = player({
  isRetired: false,
  kboPlayerId: '62360',
  name: '김태훈',
  teamShortName: '삼성',
});
samsungPitcher.position = '투수';
const samsungHitter = player({
  isRetired: false,
  kboPlayerId: '65040',
  name: '김태훈',
  teamShortName: '삼성',
});
samsungHitter.position = '외야수';

const hitterResolvedByPosition = resolveLineupPlayerSearchMatches({
  matches: [samsungPitcher, samsungHitter],
  name: '김태훈',
  teamShortName: '삼성',
  fieldPosition: '우익수',
});

assert.equal(hitterResolvedByPosition.activeMatch?.kboPlayerId, '65040');

const pitcherResolvedByPosition = resolveLineupPlayerSearchMatches({
  matches: [samsungPitcher, samsungHitter],
  name: '김태훈',
  teamShortName: '삼성',
  fieldPosition: '투수',
});

assert.equal(pitcherResolvedByPosition.activeMatch?.kboPlayerId, '62360');

console.log('lineup-player-match.test.ts: ok');
