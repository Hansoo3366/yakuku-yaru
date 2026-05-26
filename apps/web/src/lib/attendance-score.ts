import type { Game } from './baseball-api';
import { resolveOutcomeTeamId } from '@/lib/attendance-game';
import { isGameFinished } from '@/lib/game-outcome';

export type AttendanceResult = 'win' | 'lose' | 'draw';

export type GameForAttendanceScore = {
  homeTeam: { id: number };
  awayTeam: { id: number };
  homeScore: Game['homeScore'];
  awayScore: Game['awayScore'];
  status: Game['status'];
  gameDate?: Game['gameDate'];
};

export function gameHasOfficialScores(game: GameForAttendanceScore) {
  return (
    isGameFinished(game) &&
    game.homeScore !== null &&
    game.awayScore !== null
  );
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
  cheeredTeamId?: number | null;
  viewerRelation?: 'owner' | 'companion';
  ownerFavoriteTeamId?: number | null;
};

/** KBO 공식 스코어가 있으면 개인 입력은 쓰지 않습니다. */
export function resolveAttendanceOutcome(
  record: AttendanceRecordForOutcome,
  favoriteTeamId: number | null | undefined,
): AttendanceResult | null {
  const outcomeTeamId = resolveOutcomeTeamId({
    game: record.game,
    favoriteTeamId,
    cheeredTeamId: record.cheeredTeamId,
    viewerRelation: record.viewerRelation,
    ownerFavoriteTeamId: record.ownerFavoriteTeamId,
  });
  const fromGame = resolveAttendanceScoresFromGame(record.game, outcomeTeamId);

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

export function resolveOutcomeFavoriteTeamId(
  record: {
    game: GameForAttendanceScore;
    viewerRelation?: 'owner' | 'companion';
    ownerFavoriteTeamId?: number | null;
    cheeredTeamId?: number | null;
  },
  viewerFavoriteTeamId: number | null | undefined,
) {
  return resolveOutcomeTeamId({
    game: record.game,
    favoriteTeamId: viewerFavoriteTeamId,
    cheeredTeamId: record.cheeredTeamId,
    viewerRelation: record.viewerRelation,
    ownerFavoriteTeamId: record.ownerFavoriteTeamId,
  });
}

export type AttendanceTicketView = {
  outcome: AttendanceResult | null;
  awayScore: number | null;
  homeScore: number | null;
};

/** 티켓 UI: 승패는 보는 사람 응원팀 기준, 점수는 원정:홈 배치 */
export function getAttendanceTicketView(
  record: AttendanceRecordForOutcome & {
    ownerFavoriteTeamId?: number | null;
    cheeredTeamId?: number | null;
    viewerRelation?: 'owner' | 'companion';
  },
  viewerFavoriteTeamId: number | null | undefined,
): AttendanceTicketView {
  const favoriteTeamId = resolveOutcomeFavoriteTeamId(
    record,
    viewerFavoriteTeamId,
  );
  const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

  if (isGameFinished(record.game) && gameHasOfficialScores(record.game)) {
    return {
      outcome,
      awayScore: Number(record.game.awayScore),
      homeScore: Number(record.game.homeScore),
    };
  }

  const favoriteId = favoriteTeamId === null ? null : Number(favoriteTeamId);
  const homeTeamId = Number(record.game.homeTeam.id);
  const awayTeamId = Number(record.game.awayTeam.id);

  if (
    record.myTeamScore !== null &&
    record.opponentScore !== null &&
    favoriteId !== null
  ) {
    if (favoriteId === homeTeamId) {
      return {
        outcome:
          outcome ??
          inferResultFromScores(record.myTeamScore, record.opponentScore),
        awayScore: record.opponentScore,
        homeScore: record.myTeamScore,
      };
    }

    if (favoriteId === awayTeamId) {
      return {
        outcome:
          outcome ??
          inferResultFromScores(record.myTeamScore, record.opponentScore),
        awayScore: record.myTeamScore,
        homeScore: record.opponentScore,
      };
    }
  }

  return {
    outcome,
    awayScore: null,
    homeScore: null,
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
