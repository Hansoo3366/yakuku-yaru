import { request } from './api';

export type PlayerCheer = {
  playerId: number;
  kboPlayerId: string | null;
  name: string;
  backNumber: string | null;
  position: string | null;
  profileImageUrl: string | null;
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  cheerId: number | null;
  cheerTitle: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
  cheerUpdatedAt: string | null;
};

export type PlayerCheerInput = {
  title: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  lyrics: string | null;
};

export type PlayerCheerPagination = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type PlayerCheerListResponse = {
  items: PlayerCheer[];
  pagination: PlayerCheerPagination;
};

export type PlayerCheerRosterScope = 'firstTeam' | 'all';

export function listPlayerCheers(input: {
  keyword?: string;
  teamId?: number | null;
  onlyWithCheer?: boolean;
  page?: number;
  rosterScope?: PlayerCheerRosterScope;
  size?: number;
} = {}) {
  const params = new URLSearchParams();

  if (input.keyword?.trim()) {
    params.set('keyword', input.keyword.trim());
  }

  if (input.teamId) {
    params.set('teamId', String(input.teamId));
  }

  if (input.onlyWithCheer) {
    params.set('onlyWithCheer', 'true');
  }

  if (input.page) {
    params.set('page', String(input.page));
  }

  if (input.rosterScope) {
    params.set('rosterScope', input.rosterScope);
  }

  if (input.size) {
    params.set('size', String(input.size));
  }

  const query = params.toString();
  return request<PlayerCheerListResponse>(
    query ? `/player-cheers?${query}` : '/player-cheers',
  );
}

export function fetchPlayerCheer(playerId: number) {
  return request<{ item: PlayerCheer }>(`/player-cheers/${playerId}`);
}

export function listAdminPlayerCheers(
  token: string,
  input: {
    keyword?: string;
    teamId?: number | null;
    page?: number;
    rosterScope?: PlayerCheerRosterScope;
    size?: number;
  } = {},
) {
  const params = new URLSearchParams();

  if (input.keyword?.trim()) {
    params.set('keyword', input.keyword.trim());
  }

  if (input.teamId) {
    params.set('teamId', String(input.teamId));
  }

  if (input.page) {
    params.set('page', String(input.page));
  }

  if (input.rosterScope) {
    params.set('rosterScope', input.rosterScope);
  }

  if (input.size) {
    params.set('size', String(input.size));
  }

  const query = params.toString();
  return request<PlayerCheerListResponse>(
    query ? `/admin/player-cheers?${query}` : '/admin/player-cheers',
    { token },
  );
}

export function saveAdminPlayerCheer(
  playerId: number,
  input: PlayerCheerInput,
  token: string,
) {
  return request<{ item: PlayerCheer }>(`/admin/player-cheers/${playerId}`, {
    method: 'PUT',
    body: input,
    token,
  });
}

export function deleteAdminPlayerCheer(playerId: number, token: string) {
  return request<void>(`/admin/player-cheers/${playerId}`, {
    method: 'DELETE',
    token,
  });
}
