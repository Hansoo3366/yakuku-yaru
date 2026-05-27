import assert from 'node:assert/strict';
import {
  buildAttendanceScoreFields,
  gameHasOfficialScores,
  inferResultFromScores,
  resolveAttendanceOutcome,
  resolveAttendanceScoresFromGame,
  resolveAttendanceTitle,
} from './attendance-score.js';
import type { Game } from '../games/game.repository.js';

const baseGame = {
  id: 1,
  gameDate: new Date('2020-06-01 18:30:00'),
  stadium: '잠실',
  homeTeam: { id: 1, name: 'LG', shortName: 'LG', primaryColor: null, ticketUrl: null },
  awayTeam: { id: 2, name: '두산', shortName: '두산', primaryColor: null, ticketUrl: null },
  homeScore: 5,
  awayScore: 3,
  status: 'finished',
  ticketUrl: null,
  ticketOpenAt: null,
  stadiumGuide: null,
} satisfies Game;

assert.equal(gameHasOfficialScores(baseGame), true);

const official = resolveAttendanceScoresFromGame(baseGame, 1);
assert.deepEqual(official, {
  myTeamScore: 5,
  opponentScore: 3,
  result: 'win',
});

const awayFan = resolveAttendanceScoresFromGame(baseGame, 2);
assert.deepEqual(awayFan, {
  myTeamScore: 3,
  opponentScore: 5,
  result: 'lose',
});

assert.equal(inferResultFromScores(4, 4), 'draw');

const fromKbo = buildAttendanceScoreFields({
  game: baseGame,
  favoriteTeamId: 1,
  cheeredTeamId: null,
});
assert.equal(fromKbo.myTeamScore, 5);
assert.equal(fromKbo.isScoreModified, false);

const pendingGame = buildAttendanceScoreFields({
  game: { ...baseGame, homeScore: null, awayScore: null },
  favoriteTeamId: 1,
  cheeredTeamId: null,
});
assert.equal(pendingGame.myTeamScore, null);
assert.equal(pendingGame.result, null);
assert.equal(pendingGame.isScoreModified, false);

assert.equal(
  resolveAttendanceOutcome(
    {
      myTeamScore: 5,
      opponentScore: 3,
      result: 'lose',
      game: {
        ...baseGame,
        gameDate: baseGame.gameDate,
        status: 'finished',
      },
    },
    1,
  ),
  'win',
);

assert.equal(resolveAttendanceTitle(0, 80), null);
assert.equal(resolveAttendanceTitle(5, 60), '승리요정');
assert.equal(resolveAttendanceTitle(5, 50), '패배요정');
assert.equal(resolveAttendanceTitle(5, 20), '패배요정');

console.log('attendance-score.test.ts: ok');
