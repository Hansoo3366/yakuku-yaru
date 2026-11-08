import assert from 'node:assert/strict';
import test from 'node:test';
import {
  rankByRegularSeasonWinRate,
  type ParsedKboTeamStanding,
} from './parse-team-rank.js';

function standing(
  rank: number,
  teamShortName: string,
  wins: number,
  losses: number,
): ParsedKboTeamStanding {
  return {
    rank,
    teamShortName,
    games: wins + losses,
    wins,
    losses,
    draws: 0,
    winRate: Number((wins / (wins + losses)).toFixed(3)),
    gamesBehind: 0,
    recentTen: '',
    streak: '',
  };
}

void test('한국시리즈 우승팀이 1위로 바뀐 페이지도 승률로 정규시즌 순위를 매긴다', () => {
  const ranked = rankByRegularSeasonWinRate([
    standing(1, '삼성', 83, 58),
    standing(2, 'KT', 90, 49),
    standing(3, 'KIA', 79, 63),
  ]);

  assert.deepEqual(
    ranked.map((item) => [item.rank, item.teamShortName]),
    [
      [1, 'KT'],
      [2, '삼성'],
      [3, 'KIA'],
    ],
  );
});

void test('승률이 같으면 같은 순위를 준다', () => {
  const ranked = rankByRegularSeasonWinRate([
    standing(1, 'LG', 60, 40),
    standing(1, '두산', 60, 40),
    standing(3, 'NC', 50, 50),
  ]);

  assert.deepEqual(
    ranked.map((item) => item.rank),
    [1, 1, 3],
  );
});
