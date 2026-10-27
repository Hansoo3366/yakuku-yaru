import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPostseasonBracket,
  type PostseasonGameInput,
  type PostseasonSeriesId,
} from './postseason-bracket.js';

const team = (teamId: number, shortName: string) => ({ teamId, shortName, name: shortName });
const KT = team(1, 'KT');
const SAMSUNG = team(2, '삼성');
const KIA = team(3, 'KIA');
const LG = team(4, 'LG');
const DOOSAN = team(5, '두산');

const seeds = [KT, SAMSUNG, KIA, LG, DOOSAN].map((item, index) => ({
  ...item,
  seed: index + 1,
}));

let nextId = 1;
function game(
  seriesId: PostseasonSeriesId,
  gameDate: string,
  away: ReturnType<typeof team>,
  awayScore: number | null,
  home: ReturnType<typeof team>,
  homeScore: number | null,
): PostseasonGameInput {
  return {
    id: nextId++,
    seriesId,
    gameDate,
    status: awayScore === null ? 'scheduled' : 'finished',
    awayTeam: away,
    homeTeam: home,
    awayScore,
    homeScore,
  };
}

void test('와일드카드는 상위 팀이 1승만 해도 올라가고, 다음 라운드 상대가 이어진다', () => {
  const bracket = buildPostseasonBracket({
    seasonYear: 2026,
    seeds,
    games: [
      game('4', '2026-10-14T09:30:00.000Z', DOOSAN, 1, LG, 4),
      game('3', '2026-10-17T05:00:00.000Z', LG, 1, KIA, 5),
      game('3', '2026-10-18T05:00:00.000Z', LG, 3, KIA, 6),
      game('3', '2026-10-20T09:30:00.000Z', KIA, 13, LG, 1),
      game('5', '2026-10-26T09:30:00.000Z', KIA, 5, SAMSUNG, 1),
      game('5', '2026-10-27T09:30:00.000Z', KIA, null, SAMSUNG, null),
    ],
  });

  const [wc, semi, po, ks] = bracket.rounds;
  assert.equal(bracket.active, true);
  assert.equal(wc.winnerTeamId, LG.teamId);
  assert.equal(wc.status, 'finished');
  assert.deepEqual([semi.higher?.teamId, semi.lower?.teamId], [KIA.teamId, LG.teamId]);
  assert.equal(semi.higherWins, 3);
  assert.equal(semi.winnerTeamId, KIA.teamId);
  assert.deepEqual([po.higher?.teamId, po.lower?.teamId], [SAMSUNG.teamId, KIA.teamId]);
  assert.equal(po.lowerWins, 1);
  assert.equal(po.status, 'in_progress');
  assert.equal(po.games.length, 2);
  assert.equal(ks.higher?.teamId, KT.teamId);
  assert.equal(ks.lower, null);
  assert.equal(ks.lowerPlaceholder, 'PO 승자');
  assert.equal(ks.status, 'waiting');
  assert.equal(bracket.champion, null);
});

void test('와일드카드 하위 팀은 2승을 해야 올라간다', () => {
  const bracket = buildPostseasonBracket({
    seasonYear: 2026,
    seeds,
    games: [game('4', '2026-10-14T09:30:00.000Z', DOOSAN, 5, LG, 1)],
  });

  assert.equal(bracket.rounds[0].winnerTeamId, null);
  assert.equal(bracket.rounds[0].status, 'in_progress');
  assert.equal(bracket.rounds[1].lower, null);
});

void test('포스트시즌 경기가 없으면 비활성', () => {
  const bracket = buildPostseasonBracket({ seasonYear: 2026, seeds, games: [] });

  assert.equal(bracket.active, false);
  assert.equal(bracket.rounds[0].status, 'upcoming');
});
