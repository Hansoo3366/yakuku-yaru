import assert from 'node:assert/strict';
import test from 'node:test';
import { parseKboBoxScore } from './parse-box-score.js';

const grid = (rows: string[][], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    rows: rows.map((row) => ({ row: row.map((Text) => ({ Text })) })),
    ...extra,
  });

const hitterEntry = {
  table1: grid([
    ['1', '중', '박해민'],
    ['1', '타', '김현수'],
  ]),
  table2: grid([
    ['좌안', '&nbsp;', '중홈<br />/ 삼진'],
    ['&nbsp;', '&nbsp;', '2땅'],
  ]),
  table3: grid(
    [
      ['3', '2', '1', '1', '0.291'],
      ['1', '0', '0', '0', '0.250'],
    ],
    { tfoot: [{ row: ['4', '2', '1', '1', '0.272'].map((Text) => ({ Text })) }] },
  ),
};

const pitcherEntry = {
  table: grid([
    ['임찬규', '선발', '패', '14', '6', '0', '5 1/3', '22', '83', '22', '7', '1', '0', '2', '4', '4', '4.15'],
    ['고우석', '6.5', '&nbsp;', '3', '0', '1', '1/3', '3', '15', '2', '1', '0', '1', '0', '1', '1', '0.90'],
  ]),
};

void test('박스스코어 표를 선수 기록으로 바꾼다', () => {
  const boxScore = parseKboBoxScore(
    {
      tableEtc: grid([['결승타', '나성범(2회 무사서 우월 홈런)']]),
      arrHitter: [hitterEntry, hitterEntry],
      arrPitcher: [pitcherEntry, pitcherEntry],
    },
    {
      CROWD_CN: '20,500',
      USE_TM: '2:59',
      table2: grid([
        ['0', '0', '1', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
        ['0', '1', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
      ]),
      table3: grid([
        ['1', '8', '0', '4'],
        ['5', '10', '0', '2'],
      ]),
    },
  );

  assert.ok(boxScore);
  assert.equal(boxScore.inningCount, 9);
  assert.equal(boxScore.away.line.innings.length, 9);
  assert.equal(boxScore.away.line.innings[3], null);
  assert.equal(boxScore.home.line.runs, 5);
  assert.equal(boxScore.crowd, 20500);
  assert.deepEqual(boxScore.away.hitters[0].innings, ['좌안', '', '중홈 / 삼진']);
  assert.equal(boxScore.away.hitters[1].isSubstitute, true);
  assert.equal(boxScore.away.hitterTotals?.atBats, 4);
  assert.equal(boxScore.away.pitchers[0].isStarter, true);
  assert.equal(boxScore.away.pitchers[0].decision, '패');
  assert.equal(boxScore.away.pitchers[1].decision, null);
  assert.equal(boxScore.away.pitchers[0].innings, '5 1/3');
  assert.deepEqual(boxScore.notes, [
    { label: '결승타', value: '나성범(2회 무사서 우월 홈런)' },
  ]);
});

void test('팀 표가 둘 다 없으면 null', () => {
  assert.equal(parseKboBoxScore({ arrHitter: [], arrPitcher: [] }, null), null);
});
