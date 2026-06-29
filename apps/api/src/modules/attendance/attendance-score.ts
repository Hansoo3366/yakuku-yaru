import type { RowDataPacket } from 'mysql2';
import type { Game } from '../games/game.repository.js';
import { db } from '../../config/database.js';
import { findGameById } from '../games/game.repository.js';
import {
  findUserById,
  getFavoriteTeamIdFromUser,
  getFavoriteTeamShortNameFromUser,
} from '../users/user.repository.js';
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
  viewerCheeredTeamId?: number | null;
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
    viewerCheeredTeamId: record.viewerCheeredTeamId,
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
  return resolveAttendanceTitles({
    totalCount,
    stadiumCount: 0,
    homeCount: 0,
    winCount: Math.round((totalCount * winRate) / 100),
    loseCount: totalCount - Math.round((totalCount * winRate) / 100),
    drawCount: 0,
    winRate,
  })[0]?.label ?? null;
}

export type AttendanceHonorTitle = {
  key: string;
  label: string;
  description: string;
  kind:
    | 'win'
    | 'lose'
    | 'stadium'
    | 'home'
    | 'draw'
    | 'record'
    | 'weather'
    | 'special'
    | 'anger';
};

export function resolveAttendanceTitles(input: {
  totalCount: number;
  stadiumCount: number;
  homeCount: number;
  winCount: number;
  loseCount: number;
  drawCount: number;
  winRate: number;
  awayStadiumCount?: number;
  homeStadiumCount?: number;
  cancelledCount?: number;
  domeStadiumCount?: number;
  distinctStadiumCount?: number;
  dominantStadiumName?: string | null;
  dominantStadiumRatio?: number;
  oneRunGameCount?: number;
  kennedyScoreCount?: number;
  pitcherDuelCount?: number;
  doubleDigitLossCount?: number;
  maxLosingStreak?: number;
  summerDayGameCount?: number;
}): AttendanceHonorTitle[] {
  const decidedCount = input.winCount + input.loseCount + input.drawCount;
  const titles: AttendanceHonorTitle[] = [];

  if (input.stadiumCount >= 30) {
    titles.push({
      key: 'pro-stadium-fan',
      label: '프로 직관러',
      description: '직관 30경기 이상',
      kind: 'stadium',
    });
  }

  if (decidedCount >= 5 && input.winRate >= 80) {
    titles.push({
      key: 'victory-totem',
      label: '승리 토템',
      description: '승률 80% 이상',
      kind: 'win',
    });
  }

  if (decidedCount >= 5 && input.winRate <= 20) {
    titles.push({
      key: 'destroyer',
      label: '파괴신',
      description: '승률 20% 이하',
      kind: 'lose',
    });
  }

  if (decidedCount >= 3 && input.winRate >= 60) {
    titles.push({
      key: 'win-fairy',
      label: '승리요정',
      description: '승률 60% 이상',
      kind: 'win',
    });
  }

  if (decidedCount >= 3 && input.winRate <= 40) {
    titles.push({
      key: 'loss-fairy',
      label: '패배요정',
      description: '승률 40% 이하',
      kind: 'lose',
    });
  }

  if (
    input.dominantStadiumName &&
    input.stadiumCount >= 5 &&
    (input.dominantStadiumRatio ?? 0) >= 0.8
  ) {
    titles.push({
      key: 'stadium-ghost',
      label: `${input.dominantStadiumName} 지박령`,
      description: '특정 구장 직관 비율 80% 이상',
      kind: 'stadium',
    });
  }

  if ((input.distinctStadiumCount ?? 0) >= 9) {
    titles.push({
      key: 'national-stamp-tour',
      label: '전국구 도장 깨기',
      description: '서로 다른 KBO 구장 9곳 이상 방문',
      kind: 'stadium',
    });
  }

  if (
    (input.awayStadiumCount ?? 0) >= 3 &&
    (input.awayStadiumCount ?? 0) > (input.homeStadiumCount ?? 0)
  ) {
    titles.push({
      key: 'away-captain',
      label: '원정대장',
      description: '홈 경기보다 원정 경기 직관이 더 많음',
      kind: 'stadium',
    });
  }

  if (input.stadiumCount >= 5 && input.stadiumCount >= input.homeCount * 2) {
    titles.push({
      key: 'stadium-regular',
      label: '직관파',
      description: '직관 기록이 집관의 2배 이상',
      kind: 'stadium',
    });
  }

  if (input.homeCount >= 5 && input.homeCount >= input.stadiumCount * 2) {
    titles.push({
      key: 'home-manager',
      label: '집관 감독',
      description: '집관 기록이 직관의 2배 이상',
      kind: 'home',
    });
  }

  if (input.stadiumCount >= 10) {
    titles.push({
      key: 'ballpark-regular',
      label: '야구장 단골',
      description: '직관 10회 이상',
      kind: 'stadium',
    });
  }

  if (
    (input.cancelledCount ?? 0) >= 2 &&
    input.stadiumCount > 0 &&
    (input.cancelledCount ?? 0) / input.stadiumCount >= 0.2
  ) {
    titles.push({
      key: 'waterbomb-vip',
      label: '워터밤 VIP',
      description: '우천취소 경기 비율 20% 이상',
      kind: 'weather',
    });
  }

  if (
    input.stadiumCount >= 5 &&
    (input.domeStadiumCount ?? 0) / input.stadiumCount >= 0.8
  ) {
    titles.push({
      key: 'dome-refugee',
      label: '돔구장 피난민',
      description: '고척 스카이돔 직관 비율 80% 이상',
      kind: 'weather',
    });
  }

  if ((input.summerDayGameCount ?? 0) >= 1) {
    titles.push({
      key: 'summer-saint',
      label: '보살',
      description: '7~8월 낮 2시 경기 직관',
      kind: 'weather',
    });
  }

  if ((input.oneRunGameCount ?? 0) >= 5) {
    titles.push({
      key: 'heart-attack-victim',
      label: '심장 폭행 피해자',
      description: '1점 차 승부 5경기 이상 직관',
      kind: 'special',
    });
  }

  if ((input.kennedyScoreCount ?? 0) >= 1) {
    titles.push({
      key: 'kennedy-score-mania',
      label: '케네디 스코어 매니아',
      description: '8:7 스코어 경기 직관',
      kind: 'special',
    });
  }

  if (
    (input.pitcherDuelCount ?? 0) >= 3 ||
    (input.stadiumCount >= 5 &&
      (input.pitcherDuelCount ?? 0) / input.stadiumCount >= 0.3)
  ) {
    titles.push({
      key: 'sleeping-pill-fan',
      label: '수면제 직관러',
      description: '1:0, 0:0급 투수전 직관 비율 높음',
      kind: 'special',
    });
  }

  if ((input.doubleDigitLossCount ?? 0) >= 1) {
    titles.push({
      key: 'are-you-pro',
      label: '느그가 프로가',
      description: '내 팀 10점 차 이상 대패 경기 직관',
      kind: 'anger',
    });
  }

  if ((input.maxLosingStreak ?? 0) >= 3) {
    titles.push({
      key: 'i-am-happy',
      label: '나는 행복합니다',
      description: '직관 3연패 이상',
      kind: 'anger',
    });
  }

  if ((input.maxLosingStreak ?? 0) >= 5) {
    titles.push({
      key: 'living-buddha',
      label: '사리 생성기',
      description: '직관 5연패 이상',
      kind: 'anger',
    });
  }

  if (input.drawCount >= 2) {
    titles.push({
      key: 'draw-collector',
      label: '무승부 수집가',
      description: '무승부 2회 이상',
      kind: 'draw',
    });
  }

  if (input.totalCount >= 20) {
    titles.push({
      key: 'record-master',
      label: '기록의 달인',
      description: '전체 기록 20개 이상',
      kind: 'record',
    });
  }

  return titles;
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
        ownerFavoriteTeamId: getFavoriteTeamIdFromUser(user),
        ownerFavoriteTeamShortName: getFavoriteTeamShortNameFromUser(user),
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
