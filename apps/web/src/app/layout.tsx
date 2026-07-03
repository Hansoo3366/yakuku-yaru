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

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: '야크크 야르',
      alternateName: 'Yakuku Yaru',
      url: getSiteUrl(),
      inLanguage: 'ko-KR',
      description:
        'KBO 일정, 프로야구 순위, 야구 캘린더, 시즌 예상 순위를 확인하는 야구 팬 서비스',
    },
    {
      '@type': 'Service',
      name: '야크크 야르',
      alternateName: 'Yakuku Yaru',
      url: getSiteUrl(),
      inLanguage: 'ko-KR',
      serviceType: 'KBO 야구 일정 및 기록 서비스',
      provider: {
        '@type': 'Organization',
        name: 'Yakuku Yaru',
      },
      description:
        'KBO 경기 일정, 프로야구 일정표, 팀 순위, 시즌 예상 순위, 직관 기록과 응원가를 함께 확인하는 야구 팬 서비스',
      keywords:
        'KBO, 프로야구, 야구, 야구 일정, KBO 일정, KBO 경기 일정, 프로야구 일정, 프로야구 일정표, 오늘 야구 일정, 야구 캘린더, KBO 캘린더, 프로야구 순위, KBO 예상 순위, 시즌 예상 순위, 피타고리안 승률, 몬테카를로 시뮬레이션, 야구 직관',
      featureList: [
        'KBO 경기 일정',
        '프로야구 일정표',
        '야구 캘린더',
        '오늘 야구 일정',
        '프로야구 팀 순위',
        '시즌 예상 순위',
        '피타고리안 승률 기반 예측',
        '몬테카를로 시뮬레이션',
        '야구 직관 기록',
        'KBO 응원가',
      ],
    },
    {
      '@type': 'SiteNavigationElement',
      name: ['KBO 일정', '야구 캘린더', '시즌 예상 순위', 'KBO 응원가', '게시판'],
      url: [
        getAbsoluteUrl('/'),
        getAbsoluteUrl('/calendar'),
        getAbsoluteUrl('/'),
        getAbsoluteUrl('/cheers'),
        getAbsoluteUrl('/posts'),
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: '야크크 야르',
  title: {
    default: '야크크 야르 - KBO 일정·야구 캘린더·시즌 예상 순위',
    template: '%s | 야크크 야르',
  },
  description:
    'KBO 경기 일정과 프로야구 일정표, 야구 캘린더, 팀 순위, 피타고리안 승률 기반 시즌 예상 순위, 직관 기록과 응원가를 한곳에서 확인하세요.',
  keywords: [
    '야크크 야르',
    '야구',
    '야구 일정',
    '야구 일정표',
    '야구 캘린더',
    '오늘 야구 일정',
    'KBO',
    'KBO 일정',
    'KBO 경기 일정',
    'KBO 캘린더',
    'KBO 순위',
    'KBO 예상 순위',
    '프로야구',
    '프로야구 일정',
    '프로야구 일정표',
    '프로야구 캘린더',
    '프로야구 순위',
    '시즌 예상 순위',
    '피타고리안 승률',
    '몬테카를로 시뮬레이션',
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
    title: '야크크 야르 - KBO 일정·야구 캘린더·시즌 예상 순위',
    description:
      'KBO 경기 일정과 프로야구 일정표, 팀 순위, 시즌 예상 순위, 직관 기록과 응원가를 함께 확인하세요.',
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
    title: '야크크 야르 - KBO 일정·야구 캘린더·시즌 예상 순위',
    description:
      'KBO 일정, 프로야구 일정표, 야구 캘린더, 시즌 예상 순위와 직관 기록을 함께 확인하세요.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
