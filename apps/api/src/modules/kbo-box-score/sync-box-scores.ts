import { syncLog } from '../../lib/sync-log.js';
import { fetchKboBoxScore } from './kbo-box-score.client.js';
import {
  listGamesMissingBoxScore,
  saveGameBoxScore,
} from './box-score.repository.js';

/** 한 번의 동기화에서 받는 최대 경기 수. 시즌 전체를 처음 채울 때 KBO 에 요청이 몰리지 않게 나눠 받는다. */
const MAX_BOX_SCORES_PER_RUN = 40;

export type SyncBoxScoresSummary = { saved: number; failed: number };

/**
 * 기간 안에서 끝난 경기의 박스스코어를 받아 둔다. 한 경기가 실패해도 나머지는 계속 받고,
 * 일정 동기화를 실패로 만들지 않도록 던지지 않는다.
 */
export async function syncMissingBoxScores(window: {
  from: string;
  to: string;
}): Promise<SyncBoxScoresSummary> {
  let saved = 0;
  let failed = 0;

  try {
    const targets = await listGamesMissingBoxScore({
      ...window,
      limit: MAX_BOX_SCORES_PER_RUN,
    });

    if (targets.length > 0) {
      syncLog('kbo-box-score', `박스스코어 ${targets.length}경기 받는 중…`);
    }

    for (const target of targets) {
      try {
        const boxScore = await fetchKboBoxScore(target);

        if (!boxScore) {
          failed += 1;
          continue;
        }

        await saveGameBoxScore(target.gameId, boxScore);
        saved += 1;
      } catch (error) {
        failed += 1;
        console.warn(
          `[kbo-box-score] ${target.kboGameId} 실패: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } catch (error) {
    console.warn(
      `[kbo-box-score] 대상 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { saved, failed };
}
