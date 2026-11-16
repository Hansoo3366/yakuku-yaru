import { resolveStorageOutcomeTeamId } from './attendance-game.js';
import {
  resolveAttendanceOutcome,
  resolveAttendanceScoresFromGame,
  type AttendanceResult,
} from './attendance-score.js';
import {
  findAttendanceRecordById,
  listAttendanceRecordsByGame,
  listOwnedAttendanceRecords,
  updateAttendanceStoredResult,
  updateAttendanceStoredScores,
  type AttendanceRecord,
} from './attendance.repository.js';

/**
 * 저장된 스코어·결과는 조회 때가 아니라 기준이 바뀌는 시점에 맞춘다.
 * - 경기 스코어·상태 갱신(KBO 동기화, 관리자 수정): reconcileAttendanceRecordsForGame
 * - 사용자 응원팀 변경: reconcileAttendanceScoresForUser
 * - 기록 저장·수정: 저장 시 buildAttendanceScoreFields 로 계산
 */

export type AttendanceReconcilePlan =
  | { kind: 'none' }
  | {
      kind: 'scores';
      myTeamScore: number | null;
      opponentScore: number | null;
      result: AttendanceResult | null;
    }
  | { kind: 'result'; result: AttendanceResult };

/** 기록을 경기 결과·응원팀 기준에 맞추려면 무엇을 바꿔야 하는지 (DB 를 건드리지 않는다). */
export function planAttendanceReconcile(
  record: Pick<
    AttendanceRecord,
    | 'myTeamScore'
    | 'opponentScore'
    | 'result'
    | 'isScoreModified'
    | 'ownerFavoriteTeamId'
    | 'cheeredTeamId'
    | 'game'
  >,
): AttendanceReconcilePlan {
  if (record.game.status === 'cancelled') {
    const needsClear =
      record.myTeamScore !== null ||
      record.opponentScore !== null ||
      record.result !== null ||
      record.isScoreModified;

    return needsClear
      ? { kind: 'scores', myTeamScore: null, opponentScore: null, result: null }
      : { kind: 'none' };
  }

  const outcomeTeamId = resolveStorageOutcomeTeamId({
    game: record.game,
    ownerFavoriteTeamId: record.ownerFavoriteTeamId,
    cheeredTeamId: record.cheeredTeamId,
  });
  const fromGame = resolveAttendanceScoresFromGame(record.game, outcomeTeamId);

  if (fromGame) {
    const needsUpdate =
      record.myTeamScore !== fromGame.myTeamScore ||
      record.opponentScore !== fromGame.opponentScore ||
      record.result !== fromGame.result ||
      record.isScoreModified;

    return needsUpdate ? { kind: 'scores', ...fromGame } : { kind: 'none' };
  }

  const outcome = resolveAttendanceOutcome(record, outcomeTeamId);

  if (!outcome || outcome === record.result) {
    return { kind: 'none' };
  }

  return { kind: 'result', result: outcome };
}

/** 저장된 스코어·결과를 경기 결과와 응원팀 기준에 맞춘다. 실제로 고쳤으면 true. */
async function reconcileAttendanceRecord(record: AttendanceRecord) {
  const plan = planAttendanceReconcile(record);

  if (plan.kind === 'scores') {
    await updateAttendanceStoredScores({ id: record.id, ...plan });
    return true;
  }

  if (plan.kind === 'result') {
    await updateAttendanceStoredResult({ id: record.id, result: plan.result });
    return true;
  }

  return false;
}

async function reconcileAll(records: AttendanceRecord[]) {
  let updated = 0;

  for (const record of records) {
    if (await reconcileAttendanceRecord(record)) {
      updated += 1;
    }
  }

  return updated;
}

export async function reconcileAttendanceScoresForUser(userId: number) {
  return reconcileAll(await listOwnedAttendanceRecords(userId));
}

export async function reconcileAttendanceRecordsForGame(gameId: number) {
  return reconcileAll(await listAttendanceRecordsByGame(gameId));
}

export async function reconcileAttendanceRecordById(recordId: number) {
  const record = await findAttendanceRecordById(recordId);

  if (!record) {
    return null;
  }

  await reconcileAttendanceRecord(record);

  return findAttendanceRecordById(recordId);
}
