'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/auth-api';
import {
  fetchGame,
  fetchGameBoxScore,
  getFreeAgents,
  getPostseasonBracket,
  getSeasonProjection,
  listGames,
  listTeamStandings,
  listTeams,
} from '@/lib/baseball-api';
import {
  fetchAttendanceStats,
  listAttendanceRecords,
} from '@/lib/attendance-api';
import type {
  BoxScore,
  FreeAgentsResponse,
  Game,
  PostseasonBracket,
  SeasonProjectionResponse,
  Team,
  TeamStandingsResponse,
} from '@/lib/baseball-api';
import { fetchPost, listComments, listPosts } from '@/lib/post-api';
import type { PostCategory } from '@/lib/post-api';
import { fetchFanProfile, listFans } from '@/lib/user-api';
import { listPlayerCheers, listTeamCheers } from '@/lib/player-cheer-api';
import { queryKeys } from '@/lib/query-keys';
import { fetchStadium, listStadiums } from '@/lib/stadium-note-api';

export function useMeQuery(token: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.me(token),
    queryFn: () => fetchMe(token ?? ''),
    enabled: Boolean(token),
  });
}

export function useTeamsQuery(options?: {
  initialData?: { items: Team[] } | null;
}) {
  return useQuery({
    queryKey: queryKeys.teams(),
    queryFn: listTeams,
    initialData: options?.initialData ?? undefined,
    staleTime: 1000 * 60 * 60,
  });
}

export function useStadiumsQuery() {
  return useQuery({
    queryKey: queryKeys.stadiums(),
    queryFn: listStadiums,
    staleTime: 1000 * 60,
  });
}

export function useStadiumQuery(stadium: string) {
  return useQuery({
    queryKey: queryKeys.stadium(stadium),
    queryFn: () => fetchStadium(stadium),
    staleTime: 1000 * 30,
  });
}

export function useTeamStandingsQuery(
  seasonYear?: number,
  options?: {
    enabled?: boolean;
    /** 서버 컴포넌트가 미리 받아 온 값. 첫 HTML 에 데이터가 들어가게 한다. */
    initialData?: TeamStandingsResponse | null;
  },
) {
  return useQuery({
    queryKey: queryKeys.teamStandings(seasonYear),
    queryFn: () => listTeamStandings(seasonYear),
    enabled: options?.enabled ?? true,
    initialData: options?.initialData ?? undefined,
    staleTime: 1000 * 60 * 10,
  });
}

export function useSeasonProjectionQuery(
  seasonYear?: number,
  options?: { initialData?: SeasonProjectionResponse | null },
) {
  return useQuery({
    queryKey: queryKeys.seasonProjection(seasonYear),
    queryFn: () => getSeasonProjection(seasonYear),
    initialData: options?.initialData ?? undefined,
    staleTime: 1000 * 60 * 10,
  });
}

export function usePostseasonQuery(
  seasonYear: number,
  options?: { initialData?: PostseasonBracket | null },
) {
  return useQuery({
    queryKey: queryKeys.postseason(seasonYear),
    queryFn: () => getPostseasonBracket(seasonYear),
    initialData: options?.initialData ?? undefined,
    staleTime: 1000 * 60,
  });
}

export function useFreeAgentsQuery(options?: {
  initialData?: FreeAgentsResponse | null;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.freeAgents(),
    queryFn: getFreeAgents,
    initialData: options?.initialData ?? undefined,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}

/** 끝난 경기만 박스스코어가 있다. 경기 직후에는 아직 안 받아 왔을 수 있다. */
export function useGameBoxScoreQuery(
  gameId: number,
  enabled: boolean,
  options?: { initialData?: BoxScore | null },
) {
  return useQuery({
    queryKey: queryKeys.gameBoxScore(gameId),
    queryFn: () => fetchGameBoxScore(gameId),
    enabled,
    // 서버가 기록을 받아 왔을 때만 채운다. 없으면 아직 안 올라온 것이니 클라이언트가 다시 묻는다.
    initialData: options?.initialData ? { boxScore: options.initialData } : undefined,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGamesQuery(input: {
  from: string;
  to: string;
  teamId?: number | null;
}, options?: { enabled?: boolean; initialData?: Game[] | null }) {
  return useQuery({
    queryKey: queryKeys.games(input),
    queryFn: () => listGames(input),
    enabled: Boolean(input.from && input.to) && (options?.enabled ?? true),
    initialData: options?.initialData
      ? { items: options.initialData }
      : undefined,
  });
}

export function useGameQuery(
  gameId: number,
  options?: { initialData?: Game | null },
) {
  return useQuery({
    queryKey: queryKeys.game(gameId),
    queryFn: () => fetchGame(gameId),
    enabled: Number.isInteger(gameId) && gameId > 0,
    initialData: options?.initialData
      ? { game: options.initialData }
      : undefined,
    // 서버 값은 캐시된 것일 수 있어 화면에는 바로 쓰되, 낡은 것으로 보고 곧바로 다시 받는다.
    initialDataUpdatedAt: options?.initialData ? 0 : undefined,
  });
}

export function usePlayerCheersQuery(input: {
  keyword?: string;
  teamId?: number | null;
  onlyWithCheer?: boolean;
  page?: number;
  rosterScope?: 'firstTeam' | 'recentLineup' | 'all';
  size?: number;
}) {
  return useQuery({
    queryKey: queryKeys.playerCheers(input),
    queryFn: () => listPlayerCheers(input),
  });
}

export function useTeamCheersQuery() {
  return useQuery({
    queryKey: queryKeys.teamCheers(),
    queryFn: listTeamCheers,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceRecordsQuery(
  input: { from?: string; to?: string },
  token: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.attendanceRecords(input, token),
    queryFn: () => listAttendanceRecords(input, token ?? ''),
    enabled: Boolean(token) && (options?.enabled ?? true),
  });
}

/** 한 시즌(1월 1일 ~ 이듬해 1월 1일) 통계·기록 조회 기간. 홈과 /me 가 같은 캐시를 쓰도록 모은다. */
export function getAttendanceSeasonRange(seasonYear: number) {
  return {
    from: `${seasonYear}-01-01`,
    to: `${seasonYear + 1}-01-01`,
  };
}

/** 직관 통계·명예타이틀은 API 가 계산한 값만 쓴다 (웹에서 다시 계산하지 않는다). */
export function useAttendanceStatsQuery(
  token: string | null | undefined,
  input: { from?: string; to?: string } = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.attendanceStats(token, input),
    queryFn: () => fetchAttendanceStats(token ?? '', input),
    enabled: Boolean(token) && (options?.enabled ?? true),
  });
}

export function usePostsQuery(input: {
  page: number;
  keyword?: string;
  scope?: 'latest' | 'myTeam' | 'following';
  category?: PostCategory;
  token?: string | null;
}) {
  return useQuery({
    queryKey: queryKeys.posts(input),
    queryFn: () => listPosts(input),
  });
}

export function usePostQuery(postId: number) {
  return useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => fetchPost(postId),
    enabled: Number.isInteger(postId) && postId > 0,
  });
}

export function useCommentsQuery(postId: number) {
  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: () => listComments(postId),
    enabled: Number.isInteger(postId) && postId > 0,
  });
}

export function useFansQuery(
  input: { keyword?: string; teamId?: number | null; page?: number },
  token?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.fans(input, token),
    queryFn: () => listFans(input, token),
  });
}

export function useFanProfileQuery(
  userId: number,
  token?: string | null,
) {
  return useQuery({
    queryKey: queryKeys.fanProfile(userId, token),
    queryFn: () => fetchFanProfile(userId, token),
    enabled: Number.isInteger(userId) && userId > 0,
  });
}
