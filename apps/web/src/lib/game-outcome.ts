import type { Game } from './baseball-api';

export type GameOutcome =
  | 'win'
  | 'lose'
  | 'draw'
  | 'cancelled'
  | 'scheduled'
  | 'unknown';

type GameLike = {
  homeTeam: { id: number };
  awayTeam: { id: number };
  homeScore: Game['homeScore'];
  awayScore: Game['awayScore'];
  status: Game['status'];
};

export function getFavoriteTeamGameOutcome(
  game: GameLike,
  favoriteTeamId: number | null | undefined,
  attendanceResult?: string | null,
): GameOutcome {
  if (!favoriteTeamId) {
    return 'unknown';
  }

  const isHome = game.homeTeam.id === favoriteTeamId;
  const isAway = game.awayTeam.id === favoriteTeamId;

  if (!isHome && !isAway) {
    return 'unknown';
  }

  if (game.status === 'cancelled') {
    return 'cancelled';
  }

  if (game.homeScore !== null && game.awayScore !== null) {
    const myScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;

    if (myScore > oppScore) return 'win';
    if (myScore < oppScore) return 'lose';
    return 'draw';
  }

  if (
    attendanceResult === 'win' ||
    attendanceResult === 'lose' ||
    attendanceResult === 'draw'
  ) {
    return attendanceResult;
  }

  return 'scheduled';
}

export function getGameOutcomeLabel(outcome: GameOutcome) {
  switch (outcome) {
    case 'win':
      return '승';
    case 'lose':
      return '패';
    case 'draw':
      return '무';
    case 'cancelled':
      return '취소';
    case 'scheduled':
      return '예정';
    default:
      return '';
  }
}
