import { request } from './api';

export type GameReminder = {
  id: number;
  user_id: number;
  game_id: number;
  reminder_type: string;
  created_at: string;
};

export function fetchGameReminder(gameId: number, token: string) {
  return request<{ reminder: GameReminder | null; enabled: boolean }>(
    `/reminders/games/${gameId}`,
    { token },
  );
}

export function createGameReminder(gameId: number, token: string) {
  return request<{ reminder: GameReminder | null; enabled: boolean }>(
    `/reminders/games/${gameId}`,
    {
      method: 'POST',
      token,
    },
  );
}

export function deleteGameReminder(gameId: number, token: string) {
  return request<void>(`/reminders/games/${gameId}`, {
    method: 'DELETE',
    token,
  });
}
