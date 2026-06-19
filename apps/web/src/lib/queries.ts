'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/auth-api';
import {
  fetchGame,
  listGames,
  listTeamStandings,
  listTeams,
} from '@/lib/baseball-api';
import {
  fetchAttendanceStats,
  listAttendanceRecords,
} from '@/lib/attendance-api';
import { fetchPost, listComments, listPosts } from '@/lib/post-api';
import {
  fetchPlayerCheer,
  listPlayerCheers,
  listTeamCheers,
} from '@/lib/player-cheer-api';
import { queryKeys } from '@/lib/query-keys';

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

export function useTeamStandingsQuery(seasonYear?: number) {
  return useQuery({
    queryKey: queryKeys.teamStandings(seasonYear),
    queryFn: () => listTeamStandings(seasonYear),
    staleTime: 1000 * 60 * 10,
  });
}

export function useGamesQuery(input: {
  from: string;
  to: string;
  teamId?: number | null;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.games(input),
    queryFn: () => listGames(input),
    enabled: Boolean(input.from && input.to) && (options?.enabled ?? true),
  });
}

export function useGameQuery(gameId: number) {
  return useQuery({
    queryKey: queryKeys.game(gameId),
    queryFn: () => fetchGame(gameId),
    enabled: Number.isInteger(gameId) && gameId > 0,
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

export function usePlayerCheerQuery(
  playerId: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.playerCheer(playerId),
    queryFn: () => fetchPlayerCheer(playerId),
    enabled:
      Number.isInteger(playerId) &&
      playerId > 0 &&
      (options?.enabled ?? true),
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

export function useAttendanceStatsQuery(token: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.attendanceStats(token),
    queryFn: () => fetchAttendanceStats(token ?? ''),
    enabled: Boolean(token),
  });
}

export function usePostsQuery(input: { page: number; keyword?: string }) {
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
