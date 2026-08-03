import { request } from './api';

export type AdminSummary = {
  users: number;
  posts: number;
  comments: number;
  games: number;
  pendingReports: number;
  photos: number;
};

export type AdminUser = {
  id: number;
  email: string;
  nickname: string;
  role: string;
  profileImageUrl: string | null;
  favoriteTeamId: number | null;
  favoriteTeamShortName: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  postCount: number;
  commentCount: number;
};

export type AdminPost = {
  id: number;
  category: import('./post-api').PostCategory;
  title: string;
  content: string;
  isPinned: boolean;
  requestStatus: import('./post-api').FeatureRequestStatus | null;
  createdAt: string;
  authorId: number;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  commentCount: number;
};

export type AdminAttendanceRecord = {
  id: number;
  photoUrl: string | null;
  memo: string | null;
  watchType: string;
  createdAt: string;
  authorId: number;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  gameDate: string;
  stadium: string;
  homeTeamShortName: string;
  awayTeamShortName: string;
};

export type AdminReport = {
  id: number;
  targetType: 'post' | 'comment' | 'user' | 'attendance';
  targetId: number;
  targetLabel: string | null;
  reason: string;
  detail: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  adminNote: string | null;
  createdAt: string;
  reporterNickname: string;
  resolverNickname: string | null;
};

export type AdminComment = {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  postTitle: string;
  authorId: number;
  authorNickname: string;
};

export type AdminGame = {
  id: number;
  gameDate: string;
  stadium: string;
  homeTeamId: number;
  homeTeamShortName: string;
  awayTeamId: number;
  awayTeamShortName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  ticketUrl: string | null;
  ticketOpenAt: string | null;
};

export type AdminGameInput = {
  gameDate: string;
  stadium: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  ticketUrl: string | null;
  ticketOpenAt: string | null;
};

function withKeyword(path: string, keyword: string) {
  if (!keyword.trim()) return path;
  const params = new URLSearchParams({ keyword: keyword.trim() });
  return `${path}?${params.toString()}`;
}

export function fetchAdminSummary(token: string) {
  return request<AdminSummary>('/admin/summary', { token });
}

export function listAdminUsers(token: string, keyword = '') {
  return request<{ items: AdminUser[] }>(withKeyword('/admin/users', keyword), {
    token,
  });
}

export function updateAdminUserRole(userId: number, role: string, token: string) {
  return request<{ ok: boolean }>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: { role },
    token,
  });
}

export function updateAdminUserEmailVerification(
  userId: number,
  verified: boolean,
  token: string,
) {
  return request<{ ok: boolean; verified: boolean }>(
    `/admin/users/${userId}/email-verification`,
    {
      method: 'PATCH',
      body: { verified },
      token,
    },
  );
}

export function deleteAdminUser(userId: number, token: string) {
  return request<void>(`/admin/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export function clearAdminUserProfileImage(userId: number, token: string) {
  return request<void>(`/admin/users/${userId}/profile-image`, {
    method: 'DELETE',
    token,
  });
}

export function listAdminPosts(token: string, keyword = '') {
  return request<{ items: AdminPost[] }>(withKeyword('/admin/posts', keyword), {
    token,
  });
}

export function deleteAdminPost(postId: number, token: string) {
  return request<void>(`/admin/posts/${postId}`, {
    method: 'DELETE',
    token,
  });
}

export function updateAdminPostModeration(
  postId: number,
  input: {
    category: AdminPost['category'];
    isPinned: boolean;
    requestStatus: AdminPost['requestStatus'];
  },
  token: string,
) {
  return request<{ post: unknown }>(`/admin/posts/${postId}/moderation`, {
    method: 'PATCH',
    body: input,
    token,
  });
}

export function listAdminComments(token: string, keyword = '') {
  return request<{ items: AdminComment[] }>(
    withKeyword('/admin/comments', keyword),
    { token },
  );
}

export function deleteAdminComment(commentId: number, token: string) {
  return request<void>(`/admin/comments/${commentId}`, {
    method: 'DELETE',
    token,
  });
}

export function listAdminAttendanceRecords(token: string, keyword = '') {
  return request<{ items: AdminAttendanceRecord[] }>(
    withKeyword('/admin/attendance-records', keyword),
    { token },
  );
}

export function clearAdminAttendancePhoto(recordId: number, token: string) {
  return request<void>(`/admin/attendance-records/${recordId}/photo`, {
    method: 'DELETE',
    token,
  });
}

export function deleteAdminAttendanceRecord(recordId: number, token: string) {
  return request<void>(`/admin/attendance-records/${recordId}`, {
    method: 'DELETE',
    token,
  });
}

export function listAdminReports(token: string, status = '') {
  const path = status
    ? `/admin/reports?${new URLSearchParams({ status }).toString()}`
    : '/admin/reports';
  return request<{ items: AdminReport[] }>(path, { token });
}

export function updateAdminReport(
  reportId: number,
  input: { status: AdminReport['status']; adminNote?: string | null },
  token: string,
) {
  return request<{ ok: boolean }>(`/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: input,
    token,
  });
}

export function listAdminGames(token: string) {
  return request<{ items: AdminGame[] }>('/admin/games', { token });
}

export function createAdminGame(input: AdminGameInput, token: string) {
  return request<{ id: number }>('/admin/games', {
    method: 'POST',
    body: input,
    token,
  });
}

export function updateAdminGame(gameId: number, input: AdminGameInput, token: string) {
  return request<{ ok: boolean }>(`/admin/games/${gameId}`, {
    method: 'PATCH',
    body: input,
    token,
  });
}
