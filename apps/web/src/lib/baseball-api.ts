import { request } from './api';
import type { PublicUser } from './auth';

export type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
};

export type Game = {
  id: number;
  gameDate: string;
  stadium: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  ticketUrl: string | null;
  ticketOpenAt: string | null;
  stadiumGuide: {
    foodSummary: string | null;
    parkingSummary: string | null;
    mapUrl: string | null;
  } | null;
};

export function listTeams() {
  return request<{ items: Team[] }>('/teams');
}

export function updateFavoriteTeam(teamId: number, token: string) {
  return request<{ user: PublicUser }>('/users/me/favorite-team', {
    method: 'PATCH',
    body: { teamId },
    token,
  });
}

export function listGames(input: {
  from: string;
  to: string;
  teamId?: number | null;
}) {
  const params = new URLSearchParams();

  params.set('from', input.from);
  params.set('to', input.to);

  if (input.teamId) {
    params.set('teamId', String(input.teamId));
  }

  return request<{ items: Game[] }>(`/games?${params.toString()}`);
}

export function fetchGame(gameId: number) {
  return request<{ game: Game }>(`/games/${gameId}`);
}
