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
  game: { status?: string; gameDate?: string | Date },
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
  game: { status?: string; gameDate?: string | Date },
) {
  return !isGameUpcoming(game);
}

export function normalizeFavoriteTeamId(
  favoriteTeamId: number | null | undefined,
) {
  return normalizeTeamId(favoriteTeamId);
}

export function isTeamInGame(
  game: GameTeamsLike,
  teamId: number | null | undefined,
) {
  return normalizeTeamId(teamId) != null
    ? resolveFavoriteTeamIdInGame(game, teamId, null) !== null
    : false;
}

/** 응원팀이 경기에 없는 직관(중립) */
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

/** 승률·타이틀 집계 대상 (내 응원팀이 뛴 경기 — 본인·동행 공통) */
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
  viewerCheeredTeamId?: number | null;
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
      viewerCheeredTeamId: input.viewerCheeredTeamId,
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

/** 화면 승패·스코어 기준 팀 (중립이면 그날 응원 팀) */
export function resolveOutcomeTeamId(input: {
  game: GameTeamsLike;
  favoriteTeamId: number | null | undefined;
  cheeredTeamId?: number | null;
  viewerCheeredTeamId?: number | null;
  viewerRelation?: 'owner' | 'companion';
  ownerFavoriteTeamId?: number | null;
  ownerFavoriteTeamShortName?: string | null;
}) {
  const viewerTeamId = input.favoriteTeamId ?? null;

  if (input.viewerRelation === 'companion') {
    const viewerTeamInGame = resolveFavoriteTeamIdInGame(
      input.game,
      viewerTeamId,
      null,
    );

    if (viewerTeamInGame != null) {
      return viewerTeamInGame;
    }

    return resolveCheeredTeamId(input.game, input.viewerCheeredTeamId);
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

/** DB·KBO 동기화 기준 팀 (작성자 기록) */
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
