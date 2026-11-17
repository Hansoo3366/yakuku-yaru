import assert from 'node:assert/strict';
import {
  mergeSeasonTables,
  parseHiddenFields,
  parsePlayerProfile,
  parseRecordTables,
} from './parse-player-record.js';

const html = `
<div class="player_basic"><ul>
  <li><strong>선수명: </strong><span>구자욱</span></li>
  <li><strong>연봉: </strong><span>50000만원</span></li>
  <li><strong>빈칸:</strong></li>
</ul></div>
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="a&amp;b" />
<table><thead><tr><th>팀명</th><th><a title="타율">AVG</a></th></tr></thead>
<tbody><tr><td>삼성</td><td>0.371</td></tr></tbody></table>
<table><thead><tr><th><a title="볼넷">BB</a></th></tr></thead>
<tbody><tr><td>66</td></tr></tbody></table>
<table><thead><tr><th>연도</th><th>AVG</th></tr></thead>
<tbody><tr><td>2025</td><td>0.319</td></tr><tr><td colspan="2">기록이 없습니다.</td></tr></tbody>
<tfoot><tr><th colspan="1">통산</th><td>0.322</td></tr></tfoot></table>
`;

const tables = parseRecordTables(html);

assert.equal(tables.length, 3);
assert.deepEqual(tables[0].columns, [
  { key: '팀명', label: '팀명' },
  { key: 'AVG', label: '타율' },
]);
assert.deepEqual(tables[2].rows, [['2025', '0.319']]);
assert.deepEqual(tables[2].total, ['통산', '0.322']);

const season = mergeSeasonTables(tables[0], tables[1]);
assert.deepEqual(
  season?.columns.map((column) => column.key),
  ['팀명', 'AVG', 'BB'],
);
assert.deepEqual(season?.rows, [['삼성', '0.371', '66']]);
assert.equal(mergeSeasonTables({ columns: [], rows: [], total: null }), null);

assert.deepEqual(parsePlayerProfile(html), [
  { label: '선수명', value: '구자욱' },
  { label: '연봉', value: '50000만원' },
]);
assert.equal(parseHiddenFields(html).__VIEWSTATE, 'a&b');

console.log('parse-player-record.test.ts: ok');
