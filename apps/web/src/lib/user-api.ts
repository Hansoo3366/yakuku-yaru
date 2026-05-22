import { request } from './api';

export type UserSearchResult = {
  id: number;
  email: string;
  nickname: string;
  favoriteTeamId: number | null;
};

export function searchUsers(keyword: string, token: string) {
  const params = new URLSearchParams({ keyword });

  return request<{ items: UserSearchResult[] }>(
    `/users/search?${params.toString()}`,
    { token },
  );
}
