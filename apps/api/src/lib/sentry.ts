import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

/**
 * Sentry 오류 추적. SENTRY_DSN 이 설정된 환경에서만 동작하고, 없으면 모든 함수가 조용히 아무것도 하지 않는다.
 * 요청 추적(tracing)은 쓰지 않고 오류만 보낸다.
 */
export const isSentryEnabled = Boolean(env.sentry.dsn);

if (env.sentry.dsn) {
  Sentry.init({
    dsn: env.sentry.dsn,
    environment: env.sentry.environment,
    release: env.sentry.release ?? undefined,
    tracesSampleRate: 0,
  });
}

export type CaptureErrorInput = {
  /** 오류가 난 곳. Sentry 에서 tag 로 묶인다. 예: api, kbo-sync:today */
  source: string;
  error: unknown;
  /** 요청 경로 같은 보조 정보 */
  context?: Record<string, string | number | null | undefined>;
  userId?: number | null;
};

export function captureError(input: CaptureErrorInput) {
  if (!isSentryEnabled) return;

  Sentry.withScope((scope) => {
    scope.setTag('source', input.source);

    if (input.userId) {
      scope.setUser({ id: String(input.userId) });
    }

    const extras = Object.fromEntries(
      Object.entries(input.context ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    );

    if (Object.keys(extras).length) {
      scope.setExtras(extras);
    }

    Sentry.captureException(input.error);
  });
}

/** 프로세스가 끝나기 전에 아직 안 보낸 이벤트를 보낸다. */
export async function flushSentry(timeoutMs = 2_000) {
  if (!isSentryEnabled) return;

  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // 보내지 못한 이벤트는 포기한다. 종료를 막지 않는다.
  }
}
