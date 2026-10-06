import * as Sentry from '@sentry/nextjs';

/**
 * 브라우저에서 난 오류를 Sentry 로 보낸다. 빌드 때 NEXT_PUBLIC_SENTRY_DSN 이 없으면 아무것도 하지 않는다.
 * 전송은 같은 도메인의 /monitoring 으로 가므로(next.config 의 tunnelRoute) CSP 를 바꿀 필요가 없다.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
