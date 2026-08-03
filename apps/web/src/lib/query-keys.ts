export const queryKeys = {
  me: (token: string | null | undefined) => ['me', token] as const,
  teams: () => ['teams'] as const,
  teamStandings: (seasonYear?: number) => ['team-standings', seasonYear] as const,
  seasonProjection: (seasonYear?: number) =>
    ['season-projection', seasonYear] as const,
  games: (input: {
    from: string;
    to: string;
    teamId?: number | null;
  }) => ['games', input.from, input.to, input.teamId ?? null] as const,
  game: (gameId: number) => ['game', gameId] as const,
  playerCheers: (input: {
    keyword?: string;
    teamId?: number | null;
    onlyWithCheer?: boolean;
    page?: number;
    rosterScope?: 'firstTeam' | 'recentLineup' | 'all';
    size?: number;
  }) =>
    [
      'player-cheers',
      input.keyword ?? '',
      input.teamId ?? null,
      input.onlyWithCheer ?? false,
      input.page ?? 1,
      input.rosterScope ?? 'firstTeam',
      input.size ?? 24,
    ] as const,
  playerCheer: (playerId: number) => ['player-cheer', playerId] as const,
  teamCheers: () => ['team-cheers'] as const,
  attendanceRecords: (
    input: { from?: string; to?: string },
    token: string | null | undefined,
  ) => ['attendance-records', token, input.from ?? null, input.to ?? null] as const,
  attendanceStats: (
    token: string | null | undefined,
    input: { from?: string; to?: string } = {},
  ) => ['attendance-stats', token, input.from ?? null, input.to ?? null] as const,
  posts: (input: {
    page: number;
    keyword?: string;
    scope?: 'latest' | 'myTeam' | 'following';
    category?: import('./post-api').PostCategory;
    token?: string | null;
  }) =>
    [
      'posts',
      input.page,
      input.keyword ?? '',
      input.scope ?? 'latest',
      input.category ?? null,
      input.token ?? null,
    ] as const,
  post: (postId: number) => ['post', postId] as const,
  comments: (postId: number) => ['comments', postId] as const,
  fans: (
    input: { keyword?: string; teamId?: number | null; page?: number },
    token?: string | null,
  ) =>
    [
      'fans',
      input.keyword ?? '',
      input.teamId ?? null,
      input.page ?? 1,
      token ?? null,
    ] as const,
  fanProfile: (userId: number, token?: string | null) =>
    ['fan-profile', userId, token ?? null] as const,
};
