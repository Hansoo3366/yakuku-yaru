import type { Game } from './baseball-api';
import { isGameFinished } from './game-outcome';

export type GameStatusTone = 'scheduled' | 'finished' | 'cancelled';

export function getGameStatusTone(
  game: Pick<Game, 'status' | 'gameDate' | 'homeScore' | 'awayScore'>,
): GameStatusTone {
  if (game.status === 'cancelled') {
    return 'cancelled';
  }

  if (isGameFinished(game)) {
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
