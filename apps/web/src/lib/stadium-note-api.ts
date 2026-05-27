import { request } from './api';

export type UserStadiumNote = {
  stadium: string;
  foodMemo: string;
  parkingMemo: string;
  updatedAt: string;
};

export function fetchUserStadiumNote(stadium: string, token: string) {
  const params = new URLSearchParams({ stadium });

  return request<{ note: UserStadiumNote | null }>(
    `/users/me/stadium-notes?${params.toString()}`,
    { token },
  );
}

export function saveUserStadiumNote(
  input: { stadium: string; foodMemo: string; parkingMemo: string },
  token: string,
) {
  return request<{ note: UserStadiumNote | null }>('/users/me/stadium-notes', {
    method: 'PUT',
    body: input,
    token,
  });
}
