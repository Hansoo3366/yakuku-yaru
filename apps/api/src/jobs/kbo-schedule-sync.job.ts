import cron from 'node-cron';
import { env } from '../config/env.js';
import { generateKboSeasonProjection } from '../modules/kbo-season-projection/generate-season-projection.js';
import { syncKboTeamRank } from '../modules/kbo-team-rank/sync-team-rank.js';
import { runKboSyncMode } from '../modules/kbo-schedule/sync-modes.js';

const KST_TIME_ZONE = 'Asia/Seoul';

let isRunning = false;
let isProjectionRunning = false;

async function runGuarded(mode: 'week' | 'today') {
  if (isRunning) {
    console.warn(`[kbo-sync] ${mode} 동기화가 이미 실행 중이라 건너뜁니다.`);
    return;
  }

  isRunning = true;

  try {
    await runKboSyncMode(mode);

    if (mode === 'week') {
      const result = await syncKboTeamRank();
      console.log(
        `[kbo-sync] 팀 순위 반영 — ${result.seasonYear}시즌 ${result.rankDate} 기준 ${result.teamCount}팀`,
      );
    }
  } finally {
    isRunning = false;
  }
}

async function runProjectionGuarded() {
  if (isProjectionRunning) {
    console.warn('[kbo-projection] 시즌 예상 순위 계산이 이미 실행 중이라 건너뜁니다.');
    return;
  }

  isProjectionRunning = true;

  try {
    const result = await generateKboSeasonProjection({
      simulations: env.kboSync.projectionSimulations,
    });

    if (!result.stored) {
      console.warn(
        `[kbo-projection] 저장 건너뜀 — ${result.seasonYear}시즌 (${result.reason})`,
      );
      return;
    }

    console.log(
      `[kbo-projection] 저장 완료 — ${result.seasonYear}시즌 ${result.rankDate} 기준 ${result.teamCount}팀, ${result.simulations.toLocaleString('ko-KR')}회`,
    );
  } finally {
    isProjectionRunning = false;
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

  if (!cron.validate(env.kboSync.projectionCron)) {
    console.error(`[kbo-projection] 잘못된 cron: ${env.kboSync.projectionCron}`);
  } else {
    cron.schedule(
      env.kboSync.projectionCron,
      () => {
        void runProjectionGuarded().catch((error) => {
          console.error('[kbo-projection] 시즌 예상 순위 저장 실패', error);
        });
      },
      { timezone: KST_TIME_ZONE },
    );
    console.log(
      `[kbo-projection] 시즌 예상 순위 저장 등록 (${env.kboSync.projectionCron}, ${KST_TIME_ZONE})`,
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

export async function runKboSeasonProjectionSync() {
  return generateKboSeasonProjection({
    simulations: env.kboSync.projectionSimulations,
  });
}
