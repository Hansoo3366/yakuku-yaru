import assert from 'node:assert/strict';
import {
  buildAttendanceScoreFields,
  gameHasOfficialScores,
  inferResultFromScores,
  resolveAttendanceScoresFromGame,
} from './attendance-score.js';
import type { Game } from '../games/game.repository.js';

const baseGame = {
  id: 1,
  gameDate: new Date(),
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
  body: { myTeamScore: 9, opponentScore: 0, isScoreModified: true },
  normalizeNumber: (v) => (v === '' || v == null ? null : Number(v)),
});
assert.equal(fromKbo.myTeamScore, 5);
assert.equal(fromKbo.isScoreModified, false);

const manual = buildAttendanceScoreFields({
  game: { ...baseGame, homeScore: null, awayScore: null },
  favoriteTeamId: 1,
  body: { myTeamScore: 2, opponentScore: 1, result: 'win' },
  normalizeNumber: (v) => (v === '' || v == null ? null : Number(v)),
});
assert.equal(manual.myTeamScore, 2);
assert.equal(manual.isScoreModified, true);

console.log('attendance-score.test.ts: ok');
