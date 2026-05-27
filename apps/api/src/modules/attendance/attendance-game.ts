type GameTeamsLike = {
  homeTeam: { id: number; shortName?: string };
  awayTeam: { id: number; shortName?: string };
  status?: string;
};

export function normalizeTeamId(value: number | string | null | undefined) {
  if (value == null || value === '') {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

/** 프로필 응원팀이 이 경기에서 뛰는 팀 ID (경기 row 기준, ID·약칭 모두 확인) */
export function resolveFavoriteTeamIdInGame(
  game: GameTeamsLike,
  favoriteTeamId: number | null | undefined,
  favoriteTeamShortName?: string | null,
) {
  const favoriteId = normalizeTeamId(favoriteTeamId);
  const homeId = normalizeTeamId(game.homeTeam.id);
  const awayId = normalizeTeamId(game.awayTeam.id);

  if (favoriteId != null && homeId != null && favoriteId === homeId) {
    return homeId;
  }

  if (favoriteId != null && awayId != null && favoriteId === awayId) {
    return awayId;
  }

  const shortName = favoriteTeamShortName?.trim();

  if (shortName) {
    if (game.homeTeam.shortName === shortName && homeId != null) {
      return homeId;
    }

    if (game.awayTeam.shortName === shortName && awayId != null) {
      return awayId;
    }
  }

  return null;
}

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
  return normalizeTeamId(teamId) != null
    ? resolveFavoriteTeamIdInGame(game, teamId, null) !== null
    : false;
}

export function isNeutralAttendance(
  game: GameTeamsLike,
  favoriteTeamId: number | null | undefined,
  favoriteTeamShortName?: string | null,
) {
  if (!normalizeTeamId(favoriteTeamId) && !favoriteTeamShortName?.trim()) {
    return true;
  }

  return (
    resolveFavoriteTeamIdInGame(
      game,
      favoriteTeamId,
      favoriteTeamShortName,
    ) === null
  );
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
  favoriteTeamShortName?: string | null,
) {
  return (
    isNeutralAttendance(game, favoriteTeamId, favoriteTeamShortName) &&
    !isGameCancelled(game)
  );
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
  ownerFavoriteTeamShortName?: string | null;
}) {
  if (input.viewerRelation === 'companion') {
    return input.favoriteTeamId ?? null;
  }

  const ownerTeamInGame = resolveFavoriteTeamIdInGame(
    input.game,
    input.ownerFavoriteTeamId ?? input.favoriteTeamId,
    input.ownerFavoriteTeamShortName,
  );

  if (ownerTeamInGame != null) {
    return ownerTeamInGame;
  }

  return resolveCheeredTeamId(input.game, input.cheeredTeamId);
}

export function resolveStorageOutcomeTeamId(input: {
  game: GameTeamsLike;
  ownerFavoriteTeamId: number | null | undefined;
  ownerFavoriteTeamShortName?: string | null;
  cheeredTeamId?: number | null;
}) {
  const ownerTeamInGame = resolveFavoriteTeamIdInGame(
    input.game,
    input.ownerFavoriteTeamId,
    input.ownerFavoriteTeamShortName,
  );

  if (ownerTeamInGame != null) {
    return ownerTeamInGame;
  }

  return resolveCheeredTeamId(input.game, input.cheeredTeamId);
}

export function assertValidCheeredTeamId(input: {
  game: GameTeamsLike;
  ownerFavoriteTeamId: number | null | undefined;
  ownerFavoriteTeamShortName?: string | null;
  editorFavoriteTeamId?: number | null | undefined;
  editorFavoriteTeamShortName?: string | null;
  cheeredTeamId: unknown;
}) {
  if (isGameCancelled(input.game)) {
    return null;
  }

  if (
    resolveFavoriteTeamIdInGame(
      input.game,
      input.ownerFavoriteTeamId,
      input.ownerFavoriteTeamShortName,
    ) !== null
  ) {
    return null;
  }

  if (
    resolveFavoriteTeamIdInGame(
      input.game,
      input.editorFavoriteTeamId,
      input.editorFavoriteTeamShortName,
    ) !== null
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
