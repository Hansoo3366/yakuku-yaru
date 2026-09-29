import { request } from './api';

export type UserStadiumNote = {
  stadium: string;
  foodMemo: string;
  parkingMemo: string;
  isPublic: boolean;
  updatedAt: string;
};

export type StadiumSummary = {
  stadium: string;
  foodSummary: string | null;
  parkingSummary: string | null;
  mapUrl: string | null;
  publicNoteCount: number;
  lastNoteAt: string | null;
};

export type PublicStadiumNote = {
  id: number;
  foodMemo: string;
  parkingMemo: string;
  updatedAt: string;
  author: {
    id: number;
    nickname: string;
    role: string;
    profileImageUrl: string | null;
    favoriteTeamShortName: string | null;
  };
};

export function getStadiumPath(stadium: string) {
  return `/stadiums/${encodeURIComponent(stadium)}`;
}

export function listStadiums() {
  return request<{ items: StadiumSummary[] }>('/stadiums');
}

export function fetchStadium(stadium: string) {
  return request<{ stadium: StadiumSummary; notes: PublicStadiumNote[] }>(
    `/stadiums/${encodeURIComponent(stadium)}`,
  );
}

export function fetchUserStadiumNote(stadium: string, token: string) {
  const params = new URLSearchParams({ stadium });

  return request<{ note: UserStadiumNote | null }>(
    `/users/me/stadium-notes?${params.toString()}`,
    { token },
  );
}

export function saveUserStadiumNote(
  input: {
    stadium: string;
    foodMemo: string;
    parkingMemo: string;
    isPublic: boolean;
  },
  token: string,
) {
  return request<{ note: UserStadiumNote | null }>('/users/me/stadium-notes', {
    method: 'PUT',
    body: input,
    token,
  });
}
