import cron from 'node-cron';
import { env } from '../config/env.js';
import { syncKboScheduleForMonth } from '../modules/kbo-schedule/sync-schedule.js';

const KST_TIME_ZONE = 'Asia/Seoul';

export function getKstYearMonth(reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(reference);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
  };
}

/** 이번 달 + 다음 달 (연말이면 다음 해 1월 포함) */
export function getRollingKboSyncTargets(reference = new Date()) {
  const { year, month } = getKstYearMonth(reference);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return [
    { seasonYear: year, month },
    { seasonYear: nextYear, month: nextMonth },
  ];
}

export type KboScheduleSyncRunSummary = {
  targets: Array<{ seasonYear: number; month: number }>;
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
};

let isRunning = false;

export async function runKboScheduleSync(): Promise<KboScheduleSyncRunSummary> {
  if (isRunning) {
    console.warn('[kbo-sync] 이전 동기화가 아직 실행 중이라 이번 주기는 건너뜁니다.');
    return {
      targets: [],
      parsed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
    };
  }

  isRunning = true;

  try {
    const targets = getRollingKboSyncTargets();
    let parsed = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    console.log(
      `[kbo-sync] 동기화 시작 — ${targets.map((target) => `${target.seasonYear}-${String(target.month).padStart(2, '0')}`).join(', ')}`,
    );

    for (const target of targets) {
      const summary = await syncKboScheduleForMonth(target.seasonYear, target.month);
      parsed += summary.parsed;
      inserted += summary.inserted;
      updated += summary.updated;
      skipped += summary.skipped;
    }

    console.log(
      `[kbo-sync] 완료 — 파싱 ${parsed}건, 추가 ${inserted}, 갱신 ${updated}, 건너뜀 ${skipped}`,
    );

    return { targets, parsed, inserted, updated, skipped };
  } finally {
    isRunning = false;
  }
}

export function startKboScheduleSyncJob() {
  if (!env.kboSync.enabled) {
    console.log('[kbo-sync] 자동 동기화 비활성화 (KBO_SYNC_ENABLED=false)');
    return;
  }

  if (!cron.validate(env.kboSync.cron)) {
    console.error(`[kbo-sync] 잘못된 cron 표현식: ${env.kboSync.cron}`);
    return;
  }

  cron.schedule(env.kboSync.cron, () => {
    void runKboScheduleSync().catch((error) => {
      console.error('[kbo-sync] 예약 동기화 실패', error);
    });
  }, {
    timezone: KST_TIME_ZONE,
  });

  console.log(
    `[kbo-sync] 자동 동기화 등록 (${env.kboSync.cron}, ${KST_TIME_ZONE})`,
  );

  if (env.kboSync.onStart) {
    const delayMs = env.kboSync.startDelayMs;
    setTimeout(() => {
      void runKboScheduleSync().catch((error) => {
        console.error('[kbo-sync] 시작 시 동기화 실패', error);
      });
    }, delayMs);
    console.log(`[kbo-sync] API 기동 ${delayMs / 1000}초 후 1회 동기화 예정`);
  }
}
