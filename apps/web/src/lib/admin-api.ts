import { request } from './api';

export type AdminSummary = {
  users: number;
  posts: number;
  comments: number;
  games: number;
};

export type AdminUser = {
  id: number;
  email: string;
  nickname: string;
  role: string;
  profileImageUrl: string | null;
  favoriteTeamId: number | null;
  favoriteTeamShortName: string | null;
  createdAt: string;
  postCount: number;
  commentCount: number;
};

export type AdminPost = {
  id: number;
  title: string;
  createdAt: string;
  authorId: number;
  authorNickname: string;
  commentCount: number;
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

export function deleteAdminUser(userId: number, token: string) {
  return request<void>(`/admin/users/${userId}`, {
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
