import { request } from './api';
import type { AttendanceHonorTitle } from './attendance-score';
import type { PostListItem } from './post-api';

export type UserSearchResult = {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  favoriteTeamId: number | null;
  favoriteTeamShortName: string | null;
};

export type FanSummary = {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  favoriteTeam: {
    id: number;
    name: string;
    shortName: string;
    primaryColor: string | null;
  } | null;
  attendanceCount: number;
  stadiumCount: number;
  postCount: number;
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  lastActiveAt: string;
};

export type FanProfile = FanSummary & {
  stats: {
    totalCount: number;
    stadiumCount: number;
    homeCount: number;
    winRate: number;
    winCount: number;
    loseCount: number;
    drawCount: number;
    title: string | null;
    titles: AttendanceHonorTitle[];
  };
  sharedAttendanceCount: number;
  recentPosts: PostListItem[];
};

export type FanListResponse = {
  items: FanSummary[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export function searchUsers(keyword: string, token: string) {
  const params = new URLSearchParams({ keyword });

  return request<{ items: UserSearchResult[] }>(
    `/users/search?${params.toString()}`,
    { token },
  );
}

export function listFans(
  input: { keyword?: string; teamId?: number | null; page?: number },
  token?: string | null,
) {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    size: '18',
  });

  if (input.keyword) params.set('keyword', input.keyword);
  if (input.teamId) params.set('teamId', String(input.teamId));

  return request<FanListResponse>(`/users/discover?${params.toString()}`, {
    token,
  });
}

export function fetchFanProfile(userId: number, token?: string | null) {
  return request<{ fan: FanProfile }>(`/users/${userId}/profile`, { token });
}

export function followFan(userId: number, token: string) {
  return request<{ fan: FanSummary }>(`/users/${userId}/follow`, {
    method: 'POST',
    token,
  });
}

export function unfollowFan(userId: number, token: string) {
  return request<{ fan: FanSummary }>(`/users/${userId}/follow`, {
    method: 'DELETE',
    token,
  });
}
