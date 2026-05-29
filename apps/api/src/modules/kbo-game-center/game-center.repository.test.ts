import assert from 'node:assert/strict';
import { formatGameCenterGameDate } from './game-center.repository.js';

assert.equal(
  formatGameCenterGameDate('20260529', '18:30'),
  '2026-05-29 18:30:00',
);
assert.equal(formatGameCenterGameDate('20260529', '6:30'), '2026-05-29 06:30:00');
assert.equal(formatGameCenterGameDate('20260529', ''), null);
assert.equal(formatGameCenterGameDate('bad', '18:30'), null);

console.log('game-center.repository.test.ts ok');
