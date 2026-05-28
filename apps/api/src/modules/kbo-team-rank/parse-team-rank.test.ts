import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseKboTeamRankHtml } from './parse-team-rank.js';

const fixturePath = process.env.KBO_RANK_FIXTURE;

if (fixturePath) {
  const html = readFileSync(fixturePath, 'utf8');
  const parsed = parseKboTeamRankHtml(html);

  assert.equal(parsed.standings.length, 10);
  assert.equal(parsed.standings[0]?.teamShortName, '삼성');
  assert.ok(parsed.standings[0]?.winRate > 0.5);
  assert.ok(parsed.standings[0]?.recentTen.length);
  assert.ok(parsed.standings[0]?.streak.length);
  console.log('parse-team-rank.test.ts: ok');
} else {
  console.log('parse-team-rank.test.ts: skipped (set KBO_RANK_FIXTURE to run)');
}
