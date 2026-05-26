import assert from 'node:assert/strict';
import { parseKboScheduleTable } from './parse-schedule.js';

const sample = {
  rows: [
    {
      row: [
        { Text: '05.01(금)', Class: 'day', RowSpan: '5' },
        { Text: '<b>17:00</b>', Class: 'time' },
        {
          Text: '<span>NC</span><em><span class="lose">1</span><span>vs</span><span class="win">5</span></em><span>LG</span>',
          Class: 'play',
        },
        {
          Text: "<a href='/Schedule/GameCenter/Main.aspx?gameDate=20260501&gameId=20260501NCLG0&section=REVIEW'>리뷰</a>",
          Class: 'relay',
        },
        { Text: '', Class: null },
        { Text: 'SPO-2T', Class: null },
        { Text: '', Class: null },
        { Text: '잠실', Class: null },
        { Text: '-', Class: null },
      ],
    },
    {
      row: [
        { Text: '05.07(목)', Class: 'day', RowSpan: '1' },
        { Text: '<b>18:30</b>', Class: 'time' },
        {
          Text: '<span>롯데</span><em><span>vs</span></em><span>KT</span>',
          Class: 'play',
        },
        {
          Text: "<a href='/Schedule/GameCenter/Main.aspx?gameDate=20260507&gameId=20260507LTKT0'>",
          Class: 'relay',
        },
        { Text: '', Class: null },
        { Text: 'KN-T', Class: null },
        { Text: '', Class: null },
        { Text: '수원', Class: null },
        { Text: '우천취소', Class: null },
      ],
    },
  ],
};

const games = parseKboScheduleTable(sample, 2026);

assert.equal(games.length, 2);

assert.equal(games[0].externalId, '20260501NCLG0');
assert.equal(games[0].gameDate, '2026-05-01 17:00:00');
assert.equal(games[0].awayTeamShortName, 'NC');
assert.equal(games[0].homeTeamShortName, 'LG');
assert.equal(games[0].awayScore, 1);
assert.equal(games[0].homeScore, 5);
assert.equal(games[0].stadium, '잠실야구장');
assert.equal(games[0].status, 'finished');

assert.equal(games[1].awayTeamShortName, '롯데');
assert.equal(games[1].homeTeamShortName, 'KT');
assert.equal(games[1].status, 'cancelled');
assert.equal(games[1].stadium, '수원 KT위즈파크');

console.log('parse-schedule.test.ts: ok');
