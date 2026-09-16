import assert from 'node:assert/strict';
import { durationToMs } from './duration.js';

assert.equal(durationToMs('15m'), 15 * 60 * 1000);
assert.equal(durationToMs('7d'), 7 * 24 * 60 * 60 * 1000);
assert.equal(durationToMs('30D'), 30 * 24 * 60 * 60 * 1000);
assert.throws(() => durationToMs('1 month'), /Unsupported duration/);

console.log('duration.test.ts: ok');
