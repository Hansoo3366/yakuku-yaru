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
  if (favoriteTeamId == null) {
    return null;
  }

  const id = Number(favoriteTeamId);

  return Number.isInteger(id) && id > 0 ? id : null;
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

/** 응원팀이 경기에 없는 직관(중립) */
export function isNeutralAttendance(
  game: GameTeamsLike,
  favoriteTeamId: number | null | undefined,
) {
  if (!favoriteTeamId) {
    return true;
  }

  return !isTeamInGame(game, favoriteTeamId);
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

/** 화면 승패·스코어 기준 팀 (중립이면 그날 응원 팀) */
export function resolveOutcomeTeamId(input: {
  game: GameTeamsLike;
  favoriteTeamId: number | null | undefined;
  cheeredTeamId?: number | null;
  viewerRelation?: 'owner' | 'companion';
  ownerFavoriteTeamId?: number | null;
}) {
  const viewerTeamId = input.favoriteTeamId ?? null;

  if (input.viewerRelation === 'companion') {
    return viewerTeamId;
  }

  const ownerTeamId = input.ownerFavoriteTeamId ?? viewerTeamId;

  if (ownerTeamId && isTeamInGame(input.game, ownerTeamId)) {
    return ownerTeamId;
  }

  return resolveCheeredTeamId(input.game, input.cheeredTeamId);
}

/** DB·KBO 동기화 기준 팀 (작성자 기록) */
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
