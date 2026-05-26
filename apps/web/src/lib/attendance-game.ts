type GameTeamsLike = {
  homeTeam: { id: number };
  awayTeam: { id: number };
};

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
  return isTeamInGame(game, favoriteTeamId);
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
