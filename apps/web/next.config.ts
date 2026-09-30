import path from 'node:path';
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

export default nextConfig;
