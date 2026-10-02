'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/auth-api';
import {
  fetchGame,
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
  Game,
  SeasonProjectionResponse,
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

export function useTeamsQuery() {
  return useQuery({
    queryKey: queryKeys.teams(),
    queryFn: listTeams,
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

export function useAttendanceStatsQuery(
  token: string | null | undefined,
  input: { from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.attendanceStats(token, input),
    queryFn: () => fetchAttendanceStats(token ?? '', input),
    enabled: Boolean(token),
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
