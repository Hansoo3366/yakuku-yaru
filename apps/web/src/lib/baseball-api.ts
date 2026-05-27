import { request } from './api';
import type { PublicUser } from './auth';

export type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
  ticketUrl: string | null;
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
  cancellationReason: string | null;
  lineupConfirmed: boolean | null;
  probablePitchers: {
    home: {
      id: number;
      name: string;
      backNumber: string | null;
      age: number | null;
      profileImageUrl: string | null;
      throwsHand: string | null;
      batsHand: string | null;
      isConfirmed: boolean;
      stats: {
        era: number | null;
        war: number | null;
        games: number | null;
        starterAverageInnings: string | null;
        qualityStarts: number | null;
        whip: number | null;
        seasonRecord: string | null;
      };
    } | null;
    away: {
      id: number;
      name: string;
      backNumber: string | null;
      age: number | null;
      profileImageUrl: string | null;
      throwsHand: string | null;
      batsHand: string | null;
      isConfirmed: boolean;
      stats: {
        era: number | null;
        war: number | null;
        games: number | null;
        starterAverageInnings: string | null;
        qualityStarts: number | null;
        whip: number | null;
        seasonRecord: string | null;
      };
    } | null;
  };
  lineups: {
    home: GameLineupPlayer[];
    away: GameLineupPlayer[];
  };
  ticketUrl: string | null;
  ticketOpenAt: string | null;
  stadiumGuide: {
    foodSummary: string | null;
    parkingSummary: string | null;
    mapUrl: string | null;
  } | null;
};

export type GameLineupPlayer = {
  id: number;
  playerId: number;
  name: string;
  backNumber: string | null;
  age: number | null;
  profileImageUrl: string | null;
  battingOrder: number | null;
  fieldPosition: string | null;
  battingAvg: number | null;
  ops: number | null;
  war: number | null;
  isStarter: boolean;
};

export type TeamStanding = {
  rank: number;
  teamId: number;
  teamShortName: string;
  teamName: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  gamesBehind: number;
};

export type TeamStandingsResponse = {
  seasonYear: number;
  rankDate: string | null;
  seriesId: string;
  syncedAt: string | null;
  items: TeamStanding[];
};

export function listTeams() {
  return request<{ items: Team[] }>('/teams');
}

export function listTeamStandings(seasonYear?: number) {
  const params = new URLSearchParams();

  if (seasonYear) {
    params.set('seasonYear', String(seasonYear));
  }

  const query = params.toString();

  return request<TeamStandingsResponse>(
    query ? `/teams/standings?${query}` : '/teams/standings',
  );
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
