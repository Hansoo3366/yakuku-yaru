import type { Game } from './baseball-api';

export type GameStatusTone = 'scheduled' | 'finished' | 'cancelled';

export function getGameStatusTone(
  game: Pick<Game, 'status' | 'gameDate' | 'homeScore' | 'awayScore'>,
): GameStatusTone {
  if (game.status === 'cancelled') {
    return 'cancelled';
  }

  if (
    game.status === 'finished' ||
    (game.homeScore !== null && game.awayScore !== null)
  ) {
    return 'finished';
  }

  const startedAt = new Date(game.gameDate).getTime();
  const likelyEnded = startedAt < Date.now() - 4 * 60 * 60 * 1000;

  if (likelyEnded) {
    return 'finished';
  }

  return 'scheduled';
}

export function getGameStatusLabel(tone: GameStatusTone) {
  switch (tone) {
    case 'cancelled':
      return '취소';
    case 'finished':
      return '종료';
    default:
      return '예정';
  }
}

export function getGameStatusBadgeClass(tone: GameStatusTone) {
  switch (tone) {
    case 'cancelled':
      return 'badge badge-gray';
    case 'finished':
      return 'badge badge-navy';
    default:
      return 'badge badge-green';
  }
}
