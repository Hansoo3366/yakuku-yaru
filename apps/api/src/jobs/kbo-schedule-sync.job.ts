import cron from 'node-cron';
import { env } from '../config/env.js';
import { runKboSyncMode } from '../modules/kbo-schedule/sync-modes.js';

const KST_TIME_ZONE = 'Asia/Seoul';

let isRunning = false;

async function runGuarded(mode: 'week' | 'today') {
  if (isRunning) {
    console.warn(`[kbo-sync] ${mode} 동기화가 이미 실행 중이라 건너뜁니다.`);
    return;
  }

  isRunning = true;

  try {
    await runKboSyncMode(mode);
  } finally {
    isRunning = false;
  }
}

export function startKboScheduleSyncJob() {
  if (!env.kboSync.enabled) {
    console.log('[kbo-sync] 자동 동기화 비활성화 (KBO_SYNC_ENABLED=false)');
    return;
  }

  if (!cron.validate(env.kboSync.weekCron)) {
    console.error(`[kbo-sync] 잘못된 주간 cron: ${env.kboSync.weekCron}`);
  } else {
    cron.schedule(
      env.kboSync.weekCron,
      () => {
        void runGuarded('week').catch((error) => {
          console.error('[kbo-sync] 주간(일일) 동기화 실패', error);
        });
      },
      { timezone: KST_TIME_ZONE },
    );
    console.log(
      `[kbo-sync] 주간(일일) 동기화 등록 (${env.kboSync.weekCron}, ${KST_TIME_ZONE})`,
    );
  }

  if (!cron.validate(env.kboSync.todayCron)) {
    console.error(`[kbo-sync] 잘못된 당일 cron: ${env.kboSync.todayCron}`);
  } else {
    cron.schedule(
      env.kboSync.todayCron,
      () => {
        void runGuarded('today').catch((error) => {
          console.error('[kbo-sync] 당일(시간) 동기화 실패', error);
        });
      },
      { timezone: KST_TIME_ZONE },
    );
    console.log(
      `[kbo-sync] 당일(매시간) 동기화 등록 (${env.kboSync.todayCron}, ${KST_TIME_ZONE})`,
    );
  }

  if (env.kboSync.onStart) {
    const delayMs = env.kboSync.startDelayMs;
    setTimeout(() => {
      void runGuarded('week').catch((error) => {
        console.error('[kbo-sync] 시작 시 주간 동기화 실패', error);
      });
    }, delayMs);
    console.log(`[kbo-sync] API 기동 ${delayMs / 1000}초 후 주간 동기화 1회 예정`);
  }
}

export async function runKboScheduleSync() {
  return runKboSyncMode('week');
}
