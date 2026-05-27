import type { RowDataPacket } from 'mysql2';
import type { Game } from '../games/game.repository.js';
import { db } from '../../config/database.js';
import { findGameById } from '../games/game.repository.js';
import { findUserById } from '../users/user.repository.js';
import {
  isGameCancelled,
  resolveOutcomeTeamId,
  resolveStorageOutcomeTeamId,
} from './attendance-game.js';

export type AttendanceResult = 'win' | 'lose' | 'draw';

export type GameForAttendanceScore = {
  homeTeam: { id: number };
  awayTeam: { id: number };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  gameDate?: Date | string;
};

const TYPICAL_GAME_MS = 2.5 * 60 * 60 * 1000;

export function isGameFinished(
  game: Pick<GameForAttendanceScore, 'status'> & { gameDate?: Date | string },
) {
  if (game.status !== 'finished') {
    return false;
  }

  if (!game.gameDate) {
    return true;
  }

  const startedAt = new Date(game.gameDate).getTime();

  if (Number.isNaN(startedAt)) {
    return true;
  }

  return startedAt < Date.now() - TYPICAL_GAME_MS;
}

export function gameHasOfficialScores(game: GameForAttendanceScore) {
  return (
    !isGameCancelled(game) &&
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

function normalizeTeamId(value: number) {
  return Number(value);
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
  const favoriteId = normalizeTeamId(favoriteTeamId);
  const homeTeamId = normalizeTeamId(game.homeTeam.id);
  const awayTeamId = normalizeTeamId(game.awayTeam.id);

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
  favoriteTeamId: number | null,
): AttendanceResult | null {
  if (isGameCancelled(record.game)) {
    return null;
  }

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

export function buildAttendanceScoreFields(input: {
  game: Game;
  favoriteTeamId: number | null;
  cheeredTeamId?: number | null;
}) {
  if (isGameCancelled(input.game)) {
    return {
      myTeamScore: null,
      opponentScore: null,
      result: null,
      isScoreModified: false,
    };
  }

  const outcomeTeamId = resolveStorageOutcomeTeamId({
    game: input.game,
    ownerFavoriteTeamId: input.favoriteTeamId,
    cheeredTeamId: input.cheeredTeamId,
  });
  const official = resolveAttendanceScoresFromGame(input.game, outcomeTeamId);

  if (official) {
    return {
      myTeamScore: official.myTeamScore,
      opponentScore: official.opponentScore,
      result: official.result,
      isScoreModified: false,
    };
  }

  return {
    myTeamScore: null,
    opponentScore: null,
    result: null,
    isScoreModified: false,
  };
}

/** KBO 경기 스코어 갱신 시 직관 기록 스코어·결과도 맞춤 (수동 입력 포함 전부 덮어씀) */
export async function syncAttendanceScoresForGame(gameId: number) {
  const game = await findGameById(gameId);

  if (
    !game ||
    isGameCancelled(game) ||
    !isGameFinished(game) ||
    !gameHasOfficialScores(game)
  ) {
    return 0;
  }

  type AttendanceIdRow = RowDataPacket & {
    id: number;
    user_id: number;
    cheered_team_id: number | null;
  };

  const [rows] = await db.query<AttendanceIdRow[]>(
    `SELECT ar.id, ar.user_id, ar.cheered_team_id
     FROM attendance_records ar
     WHERE ar.game_id = ?`,
    [gameId],
  );

  let updated = 0;

  for (const row of rows) {
    const user = await findUserById(row.user_id);
    const scores = resolveAttendanceScoresFromGame(
      game,
      resolveStorageOutcomeTeamId({
        game,
        ownerFavoriteTeamId: user?.favoriteTeamId ?? null,
        cheeredTeamId: row.cheered_team_id,
      }),
    );

    if (!scores) {
      continue;
    }

    await db.execute(
      `UPDATE attendance_records
       SET my_team_score = ?,
           opponent_score = ?,
           result = ?,
           is_score_modified = 0
       WHERE id = ?`,
      [
        scores.myTeamScore,
        scores.opponentScore,
        scores.result,
        row.id,
      ],
    );
    updated += 1;
  }

  return updated;
}
