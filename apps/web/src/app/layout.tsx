import type { Metadata, Viewport } from 'next';
import { AppFooter, AppHeader } from '@/components/AppChrome';
import { AppProviders } from '@/components/AppProviders';
import { BottomNav } from '@/components/BottomNav';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { getAbsoluteUrl, getSiteUrl } from '@/lib/site-url';
import './globals.css';

const bootScript = `
(function () {
  try {
    var root = document.documentElement;
    root.dataset.authState = 'guest';
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
  metadataBase: new URL(getSiteUrl()),
  applicationName: '야크크 야르',
  title: {
    default: '야크크 야르~ 섹시야구',
    template: '%s | 야크크 야르',
  },
  description:
    'KBO 일정, 직관 사진, 스코어, 승률과 포토 티켓을 한곳에 기록하는 야구 팬 PWA',
  keywords: [
    '야크크 야르',
    'KBO',
    'KBO 일정',
    '프로야구',
    '야구 직관',
    '직관 기록',
    '야구 캘린더',
    '포토 티켓',
    '승률 기록',
  ],
  authors: [{ name: 'Yakuku Yaru' }],
  creator: 'Yakuku Yaru',
  publisher: 'Yakuku Yaru',
  category: 'sports',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: '야크크 야르',
    title: '야크크 야르~ 섹시야구',
    description:
      'KBO 일정과 직관 사진, 스코어와 승률, 포토 티켓을 함께 기록하는 야구 팬 PWA',
    images: [
      {
        url: getAbsoluteUrl('/main_kv.png'),
        width: 1200,
        height: 630,
        alt: '야크크 야르 KBO 직관 기록 서비스',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '야크크 야르~ 섹시야구',
    description:
      'KBO 일정과 직관 사진, 스코어와 승률, 포토 티켓을 함께 기록하는 야구 팬 PWA',
    images: [getAbsoluteUrl('/main_kv.png')],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '야크크 야르',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon.png?v=2', type: 'image/png', sizes: '1254x1254' },
    ],
    apple: '/apple-icon.png?v=2',
    shortcut: '/favicon.ico?v=2',
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
          // 첫 paint 전에 팀 컬러를 root에 미리 세팅하여
          // 디폴트 테마 색이 잠깐 보였다 사라지는 깜빡임을 방지합니다.
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
