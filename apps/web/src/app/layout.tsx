import type { Metadata, Viewport } from 'next';
import { AppFooter, AppHeader } from '@/components/AppChrome';
import { AppProviders } from '@/components/AppProviders';
import { BottomNav } from '@/components/BottomNav';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const bootScript = `
(function () {
  try {
    var root = document.documentElement;
    var token = window.localStorage.getItem('yakuku.accessToken');
    root.dataset.authState = token ? 'authed' : 'guest';
    var teamColor = window.localStorage.getItem('yakuku.teamColor');
    if (teamColor) {
      root.style.setProperty('--team-color', teamColor);
      root.style.setProperty('--team-color-soft', teamColor + '1f');
      root.style.setProperty('--team-color-strong', teamColor + 'cc');
    }
  } catch (error) {
    document.documentElement.dataset.authState = 'guest';
  }
})();
`;

export const metadata: Metadata = {
  title: '야크크 야르~ 섹시야구',
  description: 'KBO 직관과 집관을 캘린더와 포토 티켓으로 기록하는 야구 팬 PWA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '야크크 야르',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '1254x1254' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f6b4f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: bootScript }}
          // 첫 paint 전에 localStorage 기반으로 auth 상태/팀 컬러를 root에 미리 세팅하여
          // 로그인 버튼 / 디폴트 테마 색이 잠깐 보였다 사라지는 깜빡임을 방지합니다.
        />
      </head>
      <body>
        <AppProviders>
          <AppHeader />
          {children}
          <BottomNav />
          <AppFooter />
          <ServiceWorkerRegister />
        </AppProviders>
      </body>
    </html>
  );
}
