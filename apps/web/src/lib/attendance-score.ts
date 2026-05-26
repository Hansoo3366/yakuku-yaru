import type { Game } from './baseball-api';

export type AttendanceResult = 'win' | 'lose' | 'draw';

export type GameForAttendanceScore = {
  homeTeam: { id: number };
  awayTeam: { id: number };
  homeScore: Game['homeScore'];
  awayScore: Game['awayScore'];
};

export function gameHasOfficialScores(game: GameForAttendanceScore) {
  return game.homeScore !== null && game.awayScore !== null;
}

export function inferResultFromScores(
  myTeamScore: number,
  opponentScore: number,
): AttendanceResult {
  if (myTeamScore > opponentScore) return 'win';
  if (myTeamScore < opponentScore) return 'lose';
  return 'draw';
}

export function resolveAttendanceScoresFromGame(
  game: GameForAttendanceScore,
  favoriteTeamId: number | null,
): {
  myTeamScore: number;
  opponentScore: number;
  result: AttendanceResult;
} | null {
  if (!gameHasOfficialScores(game) || favoriteTeamId === null) {
    return null;
  }

  const homeScore = game.homeScore as number;
  const awayScore = game.awayScore as number;
  const favoriteId = Number(favoriteTeamId);
  const homeTeamId = Number(game.homeTeam.id);
  const awayTeamId = Number(game.awayTeam.id);

  if (favoriteId === homeTeamId) {
    return {
      myTeamScore: homeScore,
      opponentScore: awayScore,
      result: inferResultFromScores(homeScore, awayScore),
    };
  }

  if (favoriteId === awayTeamId) {
    return {
      myTeamScore: awayScore,
      opponentScore: homeScore,
      result: inferResultFromScores(awayScore, homeScore),
    };
  }

  return null;
}

export function isScoreInputLocked(
  game: GameForAttendanceScore,
  favoriteTeamId: number | null,
) {
  return resolveAttendanceScoresFromGame(game, favoriteTeamId) !== null;
}

export type AttendanceRecordForOutcome = {
  myTeamScore: number | null;
  opponentScore: number | null;
  result: string | null;
  game: GameForAttendanceScore;
};

/** KBO 공식 스코어가 있으면 개인 입력은 쓰지 않습니다. */
export function resolveAttendanceOutcome(
  record: AttendanceRecordForOutcome,
  favoriteTeamId: number | null | undefined,
): AttendanceResult | null {
  const fromGame = resolveAttendanceScoresFromGame(
    record.game,
    favoriteTeamId ?? null,
  );

  if (fromGame) {
    return fromGame.result;
  }

  if (record.myTeamScore !== null && record.opponentScore !== null) {
    return inferResultFromScores(record.myTeamScore, record.opponentScore);
  }

  if (
    record.result === 'win' ||
    record.result === 'lose' ||
    record.result === 'draw'
  ) {
    return record.result;
  }

  return null;
}

export function getAttendanceTicketView(
  record: AttendanceRecordForOutcome & {
    ownerFavoriteTeamId?: number | null;
  },
  viewerFavoriteTeamId: number | null | undefined,
) {
  const favoriteTeamId =
    record.ownerFavoriteTeamId ?? viewerFavoriteTeamId ?? null;
  const official = resolveAttendanceScoresFromGame(record.game, favoriteTeamId);
  const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

  if (official) {
    return {
      myTeamScore: official.myTeamScore,
      opponentScore: official.opponentScore,
      outcome: official.result,
    };
  }

  if (record.myTeamScore !== null && record.opponentScore !== null) {
    return {
      myTeamScore: record.myTeamScore,
      opponentScore: record.opponentScore,
      outcome:
        outcome ??
        inferResultFromScores(record.myTeamScore, record.opponentScore),
    };
  }

  return {
    myTeamScore: null,
    opponentScore: null,
    outcome,
  };
}

export function resolveAttendanceTitle(
  totalCount: number,
  winRate: number,
): string | null {
  if (totalCount <= 0) {
    return null;
  }

  if (winRate > 50) {
    return '승리요정';
  }

  return '패배요정';
}
