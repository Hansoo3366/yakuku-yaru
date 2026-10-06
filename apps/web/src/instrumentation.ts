import * as Sentry from '@sentry/nextjs';

/** Next.js 가 서버 시작 때 한 번 부른다. 런타임에 맞는 Sentry 설정을 읽는다. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

/** 서버 렌더링·라우트 핸들러에서 잡히지 않은 오류를 요청 정보와 함께 보낸다. */
export const onRequestError = Sentry.captureRequestError;
