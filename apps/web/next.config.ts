import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 운영 이미지에는 실행에 필요한 파일만 담는다 (.next/standalone). 의존성이 모노레포 루트
  // node_modules 에 올라가 있으므로 추적 기준을 루트로 잡는다.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // next/image 를 쓰지 않으므로 이미지 최적화용 sharp 바이너리(약 36MB)는 담지 않는다.
  outputFileTracingExcludes: {
    '*': ['node_modules/@img/**', 'node_modules/sharp/**'],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000',
          },
        ],
      },
    ];
  },
};

/**
 * Sentry 오류 추적. 소스맵 업로드는 하지 않는다(인증 토큰이 필요하고, 없어도 오류 수집은 된다).
 * tunnelRoute: 브라우저가 sentry.io 로 직접 보내지 않고 이 서버의 /monitoring 을 거친다.
 * 그래서 CSP connect-src 를 바꾸지 않아도 되고 광고 차단기에도 막히지 않는다.
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
  widenClientFileUpload: false,
  tunnelRoute: '/monitoring',
});
