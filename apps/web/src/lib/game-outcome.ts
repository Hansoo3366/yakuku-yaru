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

function normalizeTeamId(value: number) {
  return Number(value);
}

function normalizeScore(value: GameLike['homeScore']) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getFavoriteTeamGameOutcome(
  game: GameLike,
  favoriteTeamId: number | null | undefined,
  attendanceResult?: string | null,
): GameOutcome {
  if (!favoriteTeamId) {
    return 'unknown';
  }

  const teamId = normalizeTeamId(favoriteTeamId);
  const isHome = normalizeTeamId(game.homeTeam.id) === teamId;
  const isAway = normalizeTeamId(game.awayTeam.id) === teamId;

  if (!isHome && !isAway) {
    return 'unknown';
  }

  if (game.status === 'cancelled') {
    return 'cancelled';
  }

  const homeScore = normalizeScore(game.homeScore);
  const awayScore = normalizeScore(game.awayScore);

  if (homeScore !== null && awayScore !== null) {
    const myScore = isHome ? homeScore : awayScore;
    const oppScore = isHome ? awayScore : homeScore;

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
      return '경기전';
    default:
      return '';
  }
}
