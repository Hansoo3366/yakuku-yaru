import type { RowDataPacket } from 'mysql2';
import type { Game } from '../games/game.repository.js';
import { db } from '../../config/database.js';
import { findGameById } from '../games/game.repository.js';
import { findUserById } from '../users/user.repository.js';

export type AttendanceResult = 'win' | 'lose' | 'draw';

export type GameForAttendanceScore = {
  homeTeam: { id: number };
  awayTeam: { id: number };
  homeScore: number | null;
  awayScore: number | null;
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

  if (favoriteTeamId === game.homeTeam.id) {
    return {
      myTeamScore: homeScore,
      opponentScore: awayScore,
      result: inferResultFromScores(homeScore, awayScore),
    };
  }

  if (favoriteTeamId === game.awayTeam.id) {
    return {
      myTeamScore: awayScore,
      opponentScore: homeScore,
      result: inferResultFromScores(awayScore, homeScore),
    };
  }

  return null;
}

export function buildAttendanceScoreFields(input: {
  game: Game;
  favoriteTeamId: number | null;
  body: {
    myTeamScore?: unknown;
    opponentScore?: unknown;
    result?: string | null;
    isScoreModified?: boolean;
  };
  normalizeNumber: (value: unknown) => number | null;
}) {
  const official = resolveAttendanceScoresFromGame(input.game, input.favoriteTeamId);

  if (official) {
    return {
      myTeamScore: official.myTeamScore,
      opponentScore: official.opponentScore,
      result: official.result,
      isScoreModified: false,
    };
  }

  const myTeamScore = input.normalizeNumber(input.body.myTeamScore);
  const opponentScore = input.normalizeNumber(input.body.opponentScore);
  const hasManualScore = myTeamScore !== null || opponentScore !== null;

  return {
    myTeamScore,
    opponentScore,
    result: input.body.result || null,
    isScoreModified: input.body.isScoreModified === true || hasManualScore,
  };
}

/** KBO 경기 스코어 갱신 시 직관 기록 스코어·결과도 맞춤 (수동 입력 포함 전부 덮어씀) */
export async function syncAttendanceScoresForGame(gameId: number) {
  const game = await findGameById(gameId);

  if (!game || !gameHasOfficialScores(game)) {
    return 0;
  }

  type AttendanceIdRow = RowDataPacket & { id: number; user_id: number };

  const [rows] = await db.query<AttendanceIdRow[]>(
    `SELECT id, user_id FROM attendance_records WHERE game_id = ?`,
    [gameId],
  );

  let updated = 0;

  for (const row of rows) {
    const user = await findUserById(row.user_id);
    const scores = resolveAttendanceScoresFromGame(
      game,
      user?.favoriteTeamId ?? null,
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
