import assert from 'node:assert/strict';
import { getTeamChampionshipHistory } from './championship-history.js';

const lg = getTeamChampionshipHistory('LG');
assert.equal(lg.currentTitles, 4);
assert.equal(lg.targetTitle, 5);
assert.equal(lg.lastTitleYear, 2025);

const kia = getTeamChampionshipHistory('KIA');
assert.equal(kia.currentTitles, 12);
assert.equal(kia.targetTitle, 13);
assert.equal(kia.lastTitleYear, 2024);

const kiwoom = getTeamChampionshipHistory('키움');
assert.equal(kiwoom.currentTitles, 0);
assert.equal(kiwoom.targetTitle, 1);
assert.equal(kiwoom.lastTitleYear, null);

console.log('championship-history.test.ts ok');
