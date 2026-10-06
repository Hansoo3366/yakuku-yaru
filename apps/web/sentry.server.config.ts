import * as Sentry from '@sentry/nextjs';

/**
 * Node 서버(서버 컴포넌트, 라우트 핸들러)에서 난 오류를 Sentry 로 보낸다.
 * DSN 이 없으면 아무것도 하지 않는다. 요청 추적은 쓰지 않고 오류만 보낸다.
 */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}
