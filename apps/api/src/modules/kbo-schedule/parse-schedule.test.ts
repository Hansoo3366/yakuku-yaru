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

const previewSample = {
  rows: [
    {
      row: [
        { Text: '05.26(화)', Class: 'day', RowSpan: '1' },
        { Text: '<b>18:30</b>', Class: 'time' },
        {
          Text: '<span>KT</span><em><span>vs</span></em><span>두산</span>',
          Class: 'play',
        },
        {
          Text: "<a href='/Schedule/GameCenter/Main.aspx?gameDate=20260526&gameId=20260526KTOB0&section=START_PIT' class='btn2' id='btnPreView'>프리뷰</a>",
          Class: 'relay',
        },
        { Text: '', Class: null },
        { Text: 'MS-T', Class: null },
        { Text: '', Class: null },
        { Text: '잠실', Class: null },
        { Text: '-', Class: null },
      ],
    },
  ],
};

const previewGames = parseKboScheduleTable(previewSample, 2026);
assert.equal(previewGames.length, 1);
assert.equal(previewGames[0].status, 'scheduled');

const noGameIdSample = {
  rows: [
    {
      row: [
        { Text: '07.01(수)', Class: 'day', RowSpan: '3' },
        { Text: '<b>18:30</b>', Class: 'time' },
        {
          Text: '<span>롯데</span><em><span>vs</span></em><span>두산</span>',
          Class: 'play',
        },
        { Text: '', Class: 'relay' },
        { Text: '', Class: null },
        { Text: '', Class: null },
        { Text: '', Class: null },
        { Text: '잠실', Class: null },
        { Text: '-', Class: null },
      ],
    },
  ],
};

const pendingGames = parseKboScheduleTable(noGameIdSample, 2026);
assert.equal(pendingGames.length, 1);
assert.equal(pendingGames[0].externalId, 'pending-202607011830-롯데-두산');
assert.equal(pendingGames[0].gameDate, '2026-07-01 18:30:00');
assert.equal(pendingGames[0].stadium, '잠실야구장');
assert.equal(pendingGames[0].status, 'scheduled');

console.log('parse-schedule.test.ts: ok');
