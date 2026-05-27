import assert from 'node:assert/strict';
import { calculatePlayerAge } from './player-age.js';

assert.equal(
  calculatePlayerAge('2001-07-26', new Date('2025-05-01')),
  23,
);

assert.equal(
  calculatePlayerAge('2001-07-26', new Date('2025-08-01')),
  24,
);

assert.equal(calculatePlayerAge(null, new Date('2025-05-01')), null);

console.log('player-age.test.ts ok');
