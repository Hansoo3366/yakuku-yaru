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
  recentGameDate: string | null;
  recentBattingOrder: number | null;
  recentLineupRole: 'lineup' | 'pitcher' | 'pitcher-lineup' | null;
};

export type TeamCheer = {
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
  stats: {
    teams: PlayerCheerTeamStat[];
  };
};

export type PlayerCheerRosterScope = 'firstTeam' | 'recentLineup' | 'all';

export type PlayerCheerTeamStat = {
  teamId: number;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  totalPlayers: number;
  registeredPlayers: number;
};

export function getPlayerCheerType(
  player: Pick<PlayerCheer, 'position' | 'recentLineupRole'>,
) {
  return player.position?.includes('투수') ||
    player.recentLineupRole?.startsWith('pitcher')
    ? '등장곡'
    : '응원가';
}

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

export function listTeamCheers() {
  return request<{ items: TeamCheer[] }>('/player-cheers/teams');
}

export function fetchTeamCheer(teamId: number) {
  return request<{ item: TeamCheer }>(`/player-cheers/teams/${teamId}`);
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

export function listAdminTeamCheers(token: string) {
  return request<{ items: TeamCheer[] }>('/admin/team-cheers', { token });
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

export function saveAdminTeamCheer(
  teamId: number,
  input: PlayerCheerInput,
  token: string,
) {
  return request<{ item: TeamCheer }>(`/admin/team-cheers/${teamId}`, {
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

export function deleteAdminTeamCheer(teamId: number, token: string) {
  return request<void>(`/admin/team-cheers/${teamId}`, {
    method: 'DELETE',
    token,
  });
}
