import assert from 'node:assert/strict';
import {
  assertValidCheeredTeamId,
  canWriteAttendanceRecord,
  isGameUpcoming,
  isNeutralAttendance,
  requiresCheeredTeamPick,
} from './attendance-game.js';

const lgVsDoosan = {
  homeTeam: { id: 1, shortName: 'LG' },
  awayTeam: { id: 2, shortName: '두산' },
  status: 'scheduled',
  gameDate: '2099-06-01 18:30:00',
};

const finishedGame = {
  homeTeam: { id: 1, shortName: 'LG' },
  awayTeam: { id: 2, shortName: '두산' },
  status: 'finished',
  gameDate: '2020-06-01 18:30:00',
};

const liveGame = {
  homeTeam: { id: 1, shortName: 'LG' },
  awayTeam: { id: 2, shortName: '두산' },
  status: 'scheduled',
  gameDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
};

assert.equal(isGameUpcoming(lgVsDoosan), true);
assert.equal(canWriteAttendanceRecord(lgVsDoosan), false);
assert.equal(isGameUpcoming(liveGame), false);
assert.equal(canWriteAttendanceRecord(liveGame), true);
assert.equal(isGameUpcoming(finishedGame), false);
assert.equal(canWriteAttendanceRecord(finishedGame), true);

assert.equal(isNeutralAttendance(lgVsDoosan, 1), false);
assert.equal(isNeutralAttendance(lgVsDoosan, null, 'LG'), false);
assert.equal(requiresCheeredTeamPick(lgVsDoosan, 1), false);
assert.equal(isNeutralAttendance(lgVsDoosan, null), true);
assert.equal(requiresCheeredTeamPick(lgVsDoosan, null), true);

assert.equal(
  assertValidCheeredTeamId({
    game: lgVsDoosan,
    ownerFavoriteTeamId: 99,
    ownerFavoriteTeamShortName: 'LG',
    cheeredTeamId: null,
  }),
  null,
);

assert.equal(
  assertValidCheeredTeamId({
    game: lgVsDoosan,
    ownerFavoriteTeamId: 1,
    cheeredTeamId: null,
  }),
  null,
);

assert.equal(
  assertValidCheeredTeamId({
    game: lgVsDoosan,
    ownerFavoriteTeamId: null,
    cheeredTeamId: null,
  }),
  '이 경기에서 응원한 팀을 선택해주세요.',
);

assert.equal(
  assertValidCheeredTeamId({
    game: lgVsDoosan,
    ownerFavoriteTeamId: null,
    cheeredTeamId: 2,
  }),
  2,
);

console.log('attendance-game.test.ts passed');
