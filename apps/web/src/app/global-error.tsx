'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * 루트 레이아웃까지 무너뜨린 오류를 받는 마지막 화면.
 * 레이아웃이 없으므로 html·body 를 직접 그리고, 오류는 Sentry 로 보낸다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          alignItems: 'center',
          display: 'grid',
          fontFamily: 'system-ui, sans-serif',
          justifyItems: 'center',
          minHeight: '100vh',
          margin: 0,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            화면을 그리지 못했어요
          </h1>
          <p style={{ color: '#666', marginBottom: 20 }}>
            잠시 후 다시 시도해 주세요. 문제가 계속되면 알려 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#111',
              border: 0,
              borderRadius: 8,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              minHeight: 44,
              padding: '0 20px',
            }}
            type="button"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
