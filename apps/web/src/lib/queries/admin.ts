'use client';

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  fetchAdminSummary,
  fetchCurrentAdminSyncJob,
  listAdminAttendanceRecords,
  listAdminComments,
  listAdminFreeAgents,
  listAdminGames,
  listAdminPosts,
  listAdminReports,
  listAdminUsers,
} from '@/lib/admin-api';
import { useAuthStore } from '@/lib/auth-store';
import {
  listAdminPlayerCheers,
  listAdminTeamCheers,
  type PlayerCheerRosterScope,
} from '@/lib/player-cheer-api';

/**
 * 관리자 화면 전용 쿼리 키. 모두 'admin' 으로 시작하므로
 * invalidateQueries({ queryKey: adminKeys.all }) 한 번으로 관리자 데이터를 전부 다시 받는다.
 */
export const adminKeys = {
  all: ['admin'] as const,
  summary: () => ['admin', 'summary'] as const,
  users: (keyword: string) => ['admin', 'users', keyword] as const,
  posts: (input: AdminPostFilter) =>
    ['admin', 'posts', input.keyword, input.category, input.pin, input.page] as const,
  comments: (keyword: string) => ['admin', 'comments', keyword] as const,
  attendance: (keyword: string) => ['admin', 'attendance', keyword] as const,
  reports: () => ['admin', 'reports'] as const,
  games: (input: AdminGameFilter) =>
    ['admin', 'games', input.status, input.page] as const,
  teamCheers: () => ['admin', 'team-cheers'] as const,
  playerCheers: (input: AdminPlayerCheerFilter) =>
    [
      'admin',
      'player-cheers',
      input.keyword,
      input.teamId,
      input.rosterScope,
      input.page,
    ] as const,
  freeAgents: (year: number | null) => ['admin', 'free-agents', year] as const,
  syncJob: () => ['admin', 'sync-job'] as const,
};

export type AdminPostFilter = {
  keyword: string;
  category: string;
  pin: string;
  page: number;
};

export type AdminGameFilter = {
  status: string;
  page: number;
};

export type AdminPlayerCheerFilter = {
  keyword: string;
  teamId: number | null;
  rosterScope: PlayerCheerRosterScope;
  page: number;
};

export const ADMIN_POST_PAGE_SIZE = 20;
export const ADMIN_GAME_PAGE_SIZE = 25;
export const ADMIN_PLAYER_CHEER_PAGE_SIZE = 24;

/** 관리자 화면은 쿠키 세션을 쓴다. 토큰 값은 API 함수 시그니처를 맞추는 용도다. */
export function useAdminToken() {
  return useAuthStore((state) => state.token) ?? '';
}

export function useInvalidateAdmin() {
  const queryClient = useQueryClient();

  return useCallback(
    (...keys: (readonly unknown[])[]) => {
      const targets = keys.length ? keys : [adminKeys.all];
      return Promise.all([
        ...targets.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        // 숫자 요약(탭 배지)은 어떤 변경 뒤에도 같이 새로 받는다.
        queryClient.invalidateQueries({ queryKey: adminKeys.summary() }),
      ]);
    },
    [queryClient],
  );
}

export function useAdminSummaryQuery(enabled = true) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: () => fetchAdminSummary(token),
    enabled: Boolean(token) && enabled,
    staleTime: 1000 * 30,
  });
}

export function useAdminUsersQuery(keyword: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.users(keyword),
    queryFn: () => listAdminUsers(token, keyword),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useAdminPostsQuery(input: AdminPostFilter, size = ADMIN_POST_PAGE_SIZE) {
  const token = useAdminToken();
  return useQuery({
    queryKey: [...adminKeys.posts(input), size],
    queryFn: () =>
      listAdminPosts(token, {
        category: input.category,
        keyword: input.keyword,
        page: input.page,
        pin: input.pin,
        size,
      }),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCommentsQuery(keyword: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.comments(keyword),
    queryFn: () => listAdminComments(token, keyword),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useAdminAttendanceQuery(keyword: string) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.attendance(keyword),
    queryFn: () => listAdminAttendanceRecords(token, keyword),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

/** 신고는 상태별 개수를 함께 보여 주려고 전체를 받아 화면에서 거른다. */
export function useAdminReportsQuery() {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.reports(),
    queryFn: () => listAdminReports(token),
    enabled: Boolean(token),
  });
}

export function useAdminGamesQuery(input: AdminGameFilter) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.games(input),
    queryFn: () =>
      listAdminGames(token, {
        page: input.page,
        size: ADMIN_GAME_PAGE_SIZE,
        status: input.status,
      }),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useAdminFreeAgentsQuery(year: number | null) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.freeAgents(year),
    queryFn: () => listAdminFreeAgents(token, year),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useAdminTeamCheersQuery() {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.teamCheers(),
    queryFn: () => listAdminTeamCheers(token),
    enabled: Boolean(token),
  });
}

export function useAdminPlayerCheersQuery(input: AdminPlayerCheerFilter) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.playerCheers(input),
    queryFn: () =>
      listAdminPlayerCheers(token, {
        keyword: input.keyword,
        page: input.page,
        rosterScope: input.rosterScope,
        size: ADMIN_PLAYER_CHEER_PAGE_SIZE,
        teamId: input.teamId,
      }),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

/**
 * 가장 최근 동기화 작업. 대기·실행 중이면 2초마다 다시 묻고, 끝나면 멈춘다.
 * 서버는 작업을 메모리에만 들고 있으므로 API 를 다시 띄우면 비어 있다.
 */
export function useAdminSyncJobQuery(enabled = true) {
  const token = useAdminToken();
  return useQuery({
    queryKey: adminKeys.syncJob(),
    queryFn: () => fetchCurrentAdminSyncJob(token),
    enabled: Boolean(token) && enabled,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.job?.status;
      return status === 'queued' || status === 'running' ? 2000 : false;
    },
  });
}
