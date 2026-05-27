import assert from 'node:assert/strict';
import {
  isGameListLineupConfirmed,
  parseLineupAnalysisConfirmed,
  resolveLineupConfirmed,
} from './kbo-lineup-status.js';

assert.equal(parseLineupAnalysisConfirmed([{ LINEUP_CK: true }]), true);
assert.equal(parseLineupAnalysisConfirmed([{ LINEUP_CK: false }]), false);
assert.equal(parseLineupAnalysisConfirmed({ LINEUP_CK: true }), true);
assert.equal(parseLineupAnalysisConfirmed(null), false);

assert.equal(isGameListLineupConfirmed(0), false);
assert.equal(isGameListLineupConfirmed(null), false);
assert.equal(isGameListLineupConfirmed(47), true);
assert.equal(isGameListLineupConfirmed(1), true);

assert.equal(
  resolveLineupConfirmed({
    analysisStatusPayload: [{ LINEUP_CK: false }],
    gameListLineupCk: 33,
  }),
  true,
);

console.log('kbo-lineup-status.test.ts ok');
