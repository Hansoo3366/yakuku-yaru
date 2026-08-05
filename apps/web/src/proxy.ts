import { NextRequest, NextResponse } from 'next/server';

function getApiOrigin() {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
    ).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const apiOrigin = getApiOrigin();
  const connectSources = [
    "'self'",
    apiOrigin && apiOrigin !== 'null' ? apiOrigin : null,
    ...(isDevelopment ? ['ws:', 'wss:'] : []),
  ].filter((value): value is string => Boolean(value));

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval'" : ''
    }`,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "font-src 'self' https://cdn.jsdelivr.net data:",
    "img-src 'self' data: blob: https://6ptotvmi5753.edge.naverncp.com https://www.koreabaseball.com",
    `connect-src ${Array.from(new Set(connectSources)).join(' ')}`,
    "frame-src https://www.youtube-nocookie.com",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|uploads|_next/static|_next/image|favicon.ico|apple-icon.png|manifest.webmanifest|sw.js).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
