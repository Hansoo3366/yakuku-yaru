import { syncLog } from '../../lib/sync-log.js';
import {
  fetchKboPlayerRecord,
  type PlayerRecordRole,
} from './kbo-player-record.client.js';
import {
  findPlayerRecord,
  listFreeAgentsNeedingRecord,
  savePlayerRecord,
} from './player-record.repository.js';

/** 기록을 다시 받는 주기(일). 비시즌에는 기록이 바뀌지 않는다. */
const RECORD_STALE_DAYS = 7;
/** 한 번 동기화에서 받는 최대 선수 수. 선수 1명에 KBO 요청 3번. */
const RECORD_SYNC_LIMIT = 30;
/** 선수 사이 쉬는 시간. KBO 서버에 요청을 몰아 보내지 않는다. */
const RECORD_SYNC_DELAY_MS = 500;

const inFlight = new Map<string, Promise<void>>();

async function fetchAndSave(kboPlayerId: string, role: PlayerRecordRole) {
  const running = inFlight.get(kboPlayerId);

  if (running) {
    return running;
  }

  const task = fetchKboPlayerRecord(kboPlayerId, role)
    .then((record) => savePlayerRecord(kboPlayerId, record))
    .finally(() => inFlight.delete(kboPlayerId));
  inFlight.set(kboPlayerId, task);
  return task;
}

/** 저장된 기록을 돌려주고, 아직 없으면 그 자리에서 한 번 받아 온다. */
export async function loadPlayerRecord(
  kboPlayerId: string,
  role: PlayerRecordRole,
) {
  const saved = await findPlayerRecord(kboPlayerId);

  if (saved) {
    return saved;
  }

  await fetchAndSave(kboPlayerId, role);
  return findPlayerRecord(kboPlayerId);
}

/** FA 선수 기록 중 없거나 오래된 것만 받는다. 한 명이 실패해도 나머지는 계속 받는다. */
export async function syncFreeAgentRecords(faYear: number) {
  const targets = (
    await listFreeAgentsNeedingRecord(faYear, RECORD_STALE_DAYS)
  ).slice(0, RECORD_SYNC_LIMIT);
  let saved = 0;
  let failed = 0;

  for (const [index, target] of targets.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, RECORD_SYNC_DELAY_MS));
    }

    try {
      await fetchAndSave(target.kboPlayerId, target.role);
      saved += 1;
    } catch (error) {
      failed += 1;
      syncLog(
        'kbo-free-agents',
        `선수 기록 실패 ${target.kboPlayerId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (targets.length) {
    syncLog(
      'kbo-free-agents',
      `${faYear} FA 선수 기록 ${saved}명 저장, 실패 ${failed}명`,
    );
  }

  return { saved, failed };
}
