import { request } from './api';
import type { PublicUser } from './auth';

export type Team = {
  id: number;
  name: string;
  shortName: string;
  primaryColor: string | null;
  ticketUrl: string | null;
  championshipHistory?: TeamChampionshipHistory;
};

export type TeamChampionshipHistory = {
  currentTitles: number;
  targetTitle: number;
  lastTitleYear: number | null;
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
  recentTen: string;
  streak: string;
  championshipHistory?: TeamChampionshipHistory;
};

export type TeamStandingsResponse = {
  seasonYear: number;
  rankDate: string | null;
  seriesId: string;
  syncedAt: string | null;
  items: TeamStanding[];
};

export type SeasonProjectionRow = {
  teamId: number;
  teamShortName: string;
  teamName: string;
  playoffProbability: number;
  averageRank: number;
  averageWins: number;
  averageDraws: number;
  averageLosses: number;
  projectedGames: number;
  expectedWinRate: number;
  currentWinRate: number;
  pythagoreanWinRate: number;
  scheduleAdjustedWinRate: number;
  currentRank: number;
  championshipHistory: TeamChampionshipHistory;
};

export type PostseasonProjectionRow = {
  teamId: number;
  teamShortName: string;
  teamName: string;
  seed: number;
  averageFinalRank: number;
  koreanSeriesProbability: number;
  championshipProbability: number;
  pythagoreanWinRate: number;
  projectedWinRate: number;
  championshipHistory: TeamChampionshipHistory;
};

export type SeasonProjectionResponse = {
  seasonYear: number;
  rankDate: string | null;
  seriesId: string;
  modelVersion: string;
  generatedAt: string | null;
  status: 'regularSeason' | 'postseason';
  rows: SeasonProjectionRow[];
  postseasonRows: PostseasonProjectionRow[];
  simulations: number;
  minGames: number;
  remainingGames: number;
  projectedGames: number;
};

export type PostseasonTeam = {
  teamId: number;
  shortName: string;
  name: string;
  /** 정규시즌 순위 */
  seed: number | null;
};

export type PostseasonGame = {
  id: number;
  gameDate: string;
  status: 'scheduled' | 'finished' | 'cancelled';
  homeTeam: Omit<PostseasonTeam, 'seed'>;
  awayTeam: Omit<PostseasonTeam, 'seed'>;
  homeScore: number | null;
  awayScore: number | null;
};

export type PostseasonRound = {
  seriesId: '4' | '3' | '5' | '7';
  name: string;
  shortName: string;
  winsNeeded: { higher: number; lower: number };
  higher: PostseasonTeam | null;
  lower: PostseasonTeam | null;
  higherPlaceholder: string;
  lowerPlaceholder: string;
  higherWins: number;
  lowerWins: number;
  draws: number;
  winnerTeamId: number | null;
  status: 'waiting' | 'upcoming' | 'in_progress' | 'finished';
  games: PostseasonGame[];
};

export type PostseasonBracket = {
  seasonYear: number;
  active: boolean;
  rounds: PostseasonRound[];
  champion: PostseasonTeam | null;
};

export type BoxScoreLine = {
  innings: (number | null)[];
  runs: number | null;
  hits: number | null;
  errors: number | null;
  walks: number | null;
};

export type BoxScoreHitter = {
  battingOrder: number | null;
  position: string;
  name: string;
  isSubstitute: boolean;
  innings: string[];
  atBats: number | null;
  hits: number | null;
  rbi: number | null;
  runs: number | null;
  average: string | null;
};

export type BoxScorePitcher = {
  name: string;
  isStarter: boolean;
  decision: string | null;
  seasonWins: number | null;
  seasonLosses: number | null;
  seasonSaves: number | null;
  innings: string;
  battersFaced: number | null;
  pitches: number | null;
  atBats: number | null;
  hits: number | null;
  homeRuns: number | null;
  walks: number | null;
  strikeouts: number | null;
  runs: number | null;
  earnedRuns: number | null;
  era: string | null;
};

export type BoxScoreTeam = {
  line: BoxScoreLine;
  hitters: BoxScoreHitter[];
  hitterTotals: {
    atBats: number | null;
    hits: number | null;
    rbi: number | null;
    runs: number | null;
  } | null;
  pitchers: BoxScorePitcher[];
};

export type BoxScore = {
  inningCount: number;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  notes: { label: string; value: string }[];
  crowd: number | null;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
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

export function getSeasonProjection(seasonYear?: number) {
  const params = new URLSearchParams();

  if (seasonYear) {
    params.set('seasonYear', String(seasonYear));
  }

  const query = params.toString();

  return request<SeasonProjectionResponse>(
    query
      ? `/teams/season-projection?${query}`
      : '/teams/season-projection',
  );
}

export function getPostseasonBracket(seasonYear: number) {
  return request<PostseasonBracket>(
    `/teams/postseason?seasonYear=${seasonYear}`,
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

export function fetchGameBoxScore(gameId: number) {
  return request<{ boxScore: BoxScore | null }>(`/games/${gameId}/box-score`);
}
