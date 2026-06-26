import assert from 'node:assert/strict';
import { parsePlayerSearchHtml } from './parse-player-search.js';

const html = `
<table>
  <tr>
    <td>54</td>
    <td><a href="/Record/Retire/Hitter.aspx?playerId=77423">김상준</a></td>
    <td>삼성</td>
    <td>포수</td>
    <td>1988-01-01</td>
    <td>180cm, 85kg</td>
    <td>야구고</td>
  </tr>
  <tr>
    <td>7</td>
    <td><a href="/Player/Detail.aspx?playerId=12345">현역선수</a></td>
    <td>삼성</td>
    <td>내야수</td>
    <td>1999-01-01</td>
    <td>181cm, 80kg</td>
    <td>야구대</td>
  </tr>
</table>
`;

const players = parsePlayerSearchHtml(html);

assert.equal(players.length, 2);
assert.equal(players[0]?.kboPlayerId, '77423');
assert.equal(players[0]?.isRetired, true);
assert.equal(players[1]?.isRetired, false);

console.log('parse-player-search.test.ts: ok');
