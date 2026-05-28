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

const TYPICAL_GAME_MS = 2.5 * 60 * 60 * 1000;

/** 개시 시각이 지났거나 스코어가 있으면 경기 시작 후로 봄 */
export function hasGameStarted(
  game: Pick<GameLike, 'status' | 'homeScore' | 'awayScore'> & {
    gameDate?: string | Date;
  },
) {
  if (game.status === 'cancelled') {
    return false;
  }

  if (game.homeScore !== null && game.awayScore !== null) {
    return true;
  }

  if (!game.gameDate) {
    return false;
  }

  const startedAt = new Date(game.gameDate).getTime();

  if (Number.isNaN(startedAt)) {
    return false;
  }

  return startedAt <= Date.now();
}

/** DB가 일찍 finished로 잡혀도, 개시 후 2.5시간 전이면 경기 중·예정으로 봄 */
export function isGameFinished(
  game: Pick<GameLike, 'status'> & { gameDate?: string | Date },
) {
  if (game.status !== 'finished') {
    return false;
  }

  if (!game.gameDate) {
    return true;
  }

  const startedAt = new Date(game.gameDate).getTime();

  if (Number.isNaN(startedAt)) {
    return true;
  }

  return startedAt < Date.now() - TYPICAL_GAME_MS;
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

  if (!isGameFinished(game)) {
    return 'scheduled';
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
