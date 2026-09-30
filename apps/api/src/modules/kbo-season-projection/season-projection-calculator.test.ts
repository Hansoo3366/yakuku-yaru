import assert from 'node:assert/strict';
import type { Game } from '../games/game.repository.js';
import {
  KBO_REGULAR_SEASON_GAMES,
  calculateSeasonProjection,
} from './season-projection-calculator.js';

const TEAM_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let nextGameId = 1;

function game(input: {
  date: string;
  home: number;
  away: number;
  status: 'scheduled' | 'finished' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
}) {
  return {
    id: nextGameId++,
    gameDate: new Date(`${input.date}T18:30:00+09:00`),
    homeTeam: { id: input.home },
    awayTeam: { id: input.away },
    status: input.status,
    homeScore: input.homeScore ?? null,
    awayScore: input.awayScore ?? null,
  } as unknown as Game;
}

// 각 팀 140경기(승 60+i, 패 78-i, 무 2)를 치른 상태, 기준일 9/25.
const standings = {
  seasonYear: 2026,
  rankDate: '2026-09-25',
  seriesId: '0',
  items: TEAM_IDS.map((teamId, index) => ({
    rank: index + 1,
    teamId,
    teamShortName: `T${teamId}`,
    teamName: `Team ${teamId}`,
    games: 140,
    wins: 60 + teamId,
    losses: 78 - teamId,
    draws: 2,
    winRate: 0.5,
    gamesBehind: 0,
    recentTen: '',
    streak: '',
    championshipHistory: { currentTitles: 0, targetTitle: 1, lastTitleYear: null },
  })),
};

const games: Game[] = [];

// 득실점 계산용 지난 경기
for (const teamId of TEAM_IDS) {
  const opponent = teamId === 10 ? 1 : teamId + 1;
  games.push(
    game({ date: '2026-09-01', home: teamId, away: opponent, status: 'finished', homeScore: 3 + (teamId % 4), awayScore: 2 }),
  );
}

// 정규시즌 잔여: 팀마다 정확히 4경기 (1-2, 3-4, … 짝으로 9/26~9/29)
for (let day = 26; day <= 29; day += 1) {
  for (let home = 1; home <= 9; home += 2) {
    games.push(game({ date: `2026-09-${day}`, home, away: home + 1, status: 'scheduled' }));
  }
}

// 잔여 경기로 세면 안 되는 것들
games.push(game({ date: '2026-09-27', home: 1, away: 3, status: 'cancelled' })); // 우천 취소
games.push(game({ date: '2026-09-20', home: 5, away: 6, status: 'scheduled' })); // 기준일 이전인데 예정으로 남은 경기
for (let day = 10; day <= 14; day += 1) {
  games.push(game({ date: `2026-10-${day}`, home: 1, away: 2, status: 'scheduled' })); // 포스트시즌
}
games.push(game({ date: '2026-10-20', home: 1, away: 2, status: 'finished', homeScore: 20, awayScore: 0 })); // 포스트시즌 결과

const projection = calculateSeasonProjection(standings, games, 2000);

assert.ok(projection, 'projection should be calculated');

for (const row of projection.rows) {
  const total = row.averageWins + row.averageDraws + row.averageLosses;
  assert.ok(
    Math.abs(total - KBO_REGULAR_SEASON_GAMES) < 1e-6,
    `team ${row.teamId} expected W+D+L should be ${KBO_REGULAR_SEASON_GAMES}, got ${total}`,
  );
}

console.log('season-projection-calculator.test.ts ok');
