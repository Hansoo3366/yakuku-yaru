import * as Sentry from '@sentry/nextjs';

/** Edge 런타임(proxy.ts)에서 난 오류를 Sentry 로 보낸다. DSN 이 없으면 아무것도 하지 않는다. */
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}
