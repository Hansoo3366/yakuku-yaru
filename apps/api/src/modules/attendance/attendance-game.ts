type GameTeamsLike = {
  homeTeam: { id: number };
  awayTeam: { id: number };
  status?: string;
};

export function isGameCancelled(game: { status?: string }) {
  return game.status === 'cancelled';
}

/** 경기 시작 전 scheduled 일정 */
export function isGameUpcoming(
  game: { status?: string; gameDate?: Date | string },
) {
  if (isGameCancelled(game)) {
    return false;
  }

  if (game.status === 'finished') {
    return false;
  }

  if (!game.gameDate) {
    return game.status === 'scheduled';
  }

  const gameStart = new Date(game.gameDate).getTime();

  if (Number.isNaN(gameStart)) {
    return game.status === 'scheduled';
  }

  return gameStart > Date.now();
}

export function canWriteAttendanceRecord(
  game: { status?: string; gameDate?: Date | string },
) {
  return !isGameUpcoming(game);
}

export function isTeamInGame(
  game: GameTeamsLike,
  teamId: number | null | undefined,
) {
  if (teamId == null) {
    return false;
  }

  const id = Number(teamId);

  return Number(game.homeTeam.id) === id || Number(game.awayTeam.id) === id;
}

export function isNeutralAttendance(
  game: GameTeamsLike,
  favoriteTeamId: number | null | undefined,
) {
  if (!favoriteTeamId) {
    return true;
  }

  return !isTeamInGame(game, favoriteTeamId);
}

export function countsTowardWinRate(
  game: GameTeamsLike,
  favoriteTeamId: number | null | undefined,
) {
  if (isGameCancelled(game)) {
    return false;
  }

  return isTeamInGame(game, favoriteTeamId);
}

/** 기록 단위 집계 대상 여부 (응원팀 변경/중립 직관 cheeredTeam 반영) */
export function countsTowardWinRateForRecord(input: {
  game: GameTeamsLike;
  favoriteTeamId: number | null | undefined;
  cheeredTeamId?: number | null;
  viewerRelation?: 'owner' | 'companion';
  ownerFavoriteTeamId?: number | null;
}) {
  if (isGameCancelled(input.game)) {
    return false;
  }

  return (
    resolveOutcomeTeamId({
      game: input.game,
      favoriteTeamId: input.favoriteTeamId,
      cheeredTeamId: input.cheeredTeamId,
      viewerRelation: input.viewerRelation,
      ownerFavoriteTeamId: input.ownerFavoriteTeamId,
    }) !== null
  );
}

export function requiresCheeredTeamPick(
  game: GameTeamsLike,
  favoriteTeamId: number | null | undefined,
) {
  return isNeutralAttendance(game, favoriteTeamId) && !isGameCancelled(game);
}

export function resolveCheeredTeamId(
  game: GameTeamsLike,
  cheeredTeamId: number | null | undefined,
) {
  if (cheeredTeamId == null || !isTeamInGame(game, cheeredTeamId)) {
    return null;
  }

  return Number(cheeredTeamId);
}

export function resolveOutcomeTeamId(input: {
  game: GameTeamsLike;
  favoriteTeamId: number | null | undefined;
  cheeredTeamId?: number | null;
  viewerRelation?: 'owner' | 'companion';
  ownerFavoriteTeamId?: number | null;
}) {
  if (input.viewerRelation === 'companion') {
    return input.favoriteTeamId ?? null;
  }

  const ownerTeamId = input.ownerFavoriteTeamId ?? input.favoriteTeamId ?? null;

  if (ownerTeamId && isTeamInGame(input.game, ownerTeamId)) {
    return ownerTeamId;
  }

  return resolveCheeredTeamId(input.game, input.cheeredTeamId);
}

export function resolveStorageOutcomeTeamId(input: {
  game: GameTeamsLike;
  ownerFavoriteTeamId: number | null | undefined;
  cheeredTeamId?: number | null;
}) {
  if (
    input.ownerFavoriteTeamId &&
    isTeamInGame(input.game, input.ownerFavoriteTeamId)
  ) {
    return input.ownerFavoriteTeamId;
  }

  return resolveCheeredTeamId(input.game, input.cheeredTeamId);
}

export function assertValidCheeredTeamId(input: {
  game: GameTeamsLike;
  ownerFavoriteTeamId: number | null | undefined;
  editorFavoriteTeamId?: number | null | undefined;
  cheeredTeamId: unknown;
}) {
  if (isGameCancelled(input.game)) {
    return null;
  }

  if (
    input.ownerFavoriteTeamId &&
    isTeamInGame(input.game, input.ownerFavoriteTeamId)
  ) {
    return null;
  }

  if (
    input.editorFavoriteTeamId &&
    isTeamInGame(input.game, input.editorFavoriteTeamId)
  ) {
    return null;
  }

  const teamId =
    typeof input.cheeredTeamId === 'number'
      ? input.cheeredTeamId
      : Number(input.cheeredTeamId);

  if (!Number.isInteger(teamId) || !isTeamInGame(input.game, teamId)) {
    return '이 경기에서 응원한 팀을 선택해주세요.';
  }

  return teamId;
}
