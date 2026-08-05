import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
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
      if (!/^#[0-9a-f]{6}$/i.test(teamColor)) {
        [
          'yakuku.teamColor',
          'yakuku.teamSurface',
          'yakuku.teamContrast',
          'yakuku.teamDisplay',
          'yakuku.teamDisplayContrast'
        ].forEach(function (key) {
          window.localStorage.removeItem(key);
        });
        return;
      }

      var toLuminance = function (hex) {
        var channels = [1, 3, 5].map(function (offset) {
          var value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
          return value <= 0.04045
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      var getContrastColor = function (background) {
        var backgroundLuminance = toLuminance(background);
        var darkLuminance = toLuminance('#111111');
        var lightContrast = 1.05 / (backgroundLuminance + 0.05);
        var darkContrast =
          (Math.max(backgroundLuminance, darkLuminance) + 0.05) /
          (Math.min(backgroundLuminance, darkLuminance) + 0.05);
        return darkContrast > lightContrast ? '#111111' : '#ffffff';
      };
      var toHex = function (channels) {
        return '#' + channels.map(function (channel) {
          return Math.round(channel).toString(16).padStart(2, '0');
        }).join('');
      };
      var sourceChannels = [1, 3, 5].map(function (offset) {
        return parseInt(teamColor.slice(offset, offset + 2), 16);
      });
      var teamSurface = '#000000';
      for (var percentage = 100; percentage >= 0; percentage -= 1) {
        var candidate = toHex(sourceChannels.map(function (channel) {
          return channel * (percentage / 100);
        }));
        if (1.05 / (toLuminance(candidate) + 0.05) >= 7) {
          teamSurface = candidate;
          break;
        }
      }
      var teamContrast = getContrastColor(teamColor);
      var teamDisplay = toHex(sourceChannels.map(function (channel) {
        return channel * 0.95 + 255 * 0.05;
      }));
      var teamDisplayContrast = getContrastColor(teamDisplay);

      root.style.setProperty('--team-color', teamColor);
      root.style.setProperty('--team-color-soft', teamColor + '1f');
      root.style.setProperty('--team-color-strong', teamColor + 'cc');
      root.style.setProperty('--team-color-ink', teamSurface);
      root.style.setProperty('--team-color-surface', teamSurface);
      root.style.setProperty('--team-color-contrast', teamContrast);
      root.style.setProperty('--team-color-display', teamDisplay);
      root.style.setProperty('--team-color-display-contrast', teamDisplayContrast);
      window.localStorage.setItem('yakuku.teamSurface', teamSurface);
      window.localStorage.setItem('yakuku.teamContrast', teamContrast);
      window.localStorage.setItem('yakuku.teamDisplay', teamDisplay);
      window.localStorage.setItem('yakuku.teamDisplayContrast', teamDisplayContrast);
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
        'KBO 일정, 오늘 프로야구 경기, 야구 캘린더, 팀 순위, 시즌 예상 순위와 가을야구 확률을 확인하는 야구 팬 서비스',
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
        'KBO 경기 일정, 프로야구 일정표, 팀 순위, 시즌 예상 순위, 가을야구 진출 확률, 포스트시즌 최종 예측, 직관 기록과 응원가를 함께 확인하는 야구 팬 서비스',
      keywords:
        'KBO, 프로야구, 야구, 야구 일정, KBO 일정, KBO 경기 일정, 프로야구 일정, 프로야구 일정표, 오늘 야구 일정, 오늘 프로야구, 오늘 야구 경기, 야구 캘린더, KBO 캘린더, 프로야구 순위, KBO 순위, KBO 팀 순위, KBO 예상 순위, 시즌 예상 순위, 프로야구 예상 순위, 가을야구 확률, 포스트시즌 진출 확률, KBO 포스트시즌, KBO 플레이오프, KBO 와일드카드, 한국시리즈 예측, 우승 확률, 피타고리안 승률, 몬테카를로 시뮬레이션, KBO 선발투수, KBO 라인업, 야구 직관, 직관 후기',
      featureList: [
        'KBO 경기 일정',
        '프로야구 일정표',
        '야구 캘린더',
        '오늘 야구 일정',
        '프로야구 팀 순위',
        '시즌 예상 순위',
        '가을야구 진출 확률',
        'KBO 포스트시즌 최종 예측',
        '한국시리즈 우승 확률',
        '피타고리안 승률 기반 예측',
        '몬테카를로 시뮬레이션',
        'KBO 경기 상세',
        '선발 투수와 라인업',
        '야구 직관 기록',
        '직관 후기 게시판',
        '야구팬 찾기',
        'KBO 응원가',
      ],
    },
    {
      '@type': 'WebApplication',
      name: '야크크 야르',
      alternateName: 'Yakuku Yaru',
      url: getSiteUrl(),
      inLanguage: 'ko-KR',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Any',
      description:
        'KBO 일정표, 야구 캘린더, 시즌 예상 순위, 가을야구 확률, 포스트시즌 예측과 직관 기록을 제공하는 야구 팬 웹앱',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'KRW',
      },
    },
    {
      '@type': 'SiteNavigationElement',
      name: [
        'KBO 일정',
        '야구 캘린더',
        '시즌 예상 순위',
        '가을야구 확률',
        'KBO 응원가',
        '직관 후기 게시판',
        '야구팬 찾기',
      ],
      url: [
        getAbsoluteUrl('/'),
        getAbsoluteUrl('/calendar'),
        getAbsoluteUrl('/'),
        getAbsoluteUrl('/'),
        getAbsoluteUrl('/cheers'),
        getAbsoluteUrl('/posts'),
        getAbsoluteUrl('/fans'),
      ],
    },
  ],
};

const serializedStructuredData = JSON.stringify(structuredData).replace(
  /</g,
  '\\u003c',
);

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: '야크크 야르',
  title: {
    default: '야크크 야르 - KBO 일정·시즌 예상 순위·가을야구 확률',
    template: '%s | 야크크 야르',
  },
  description:
    'KBO 경기 일정과 프로야구 일정표, 야구 캘린더, 팀 순위, 피타고리안 승률 기반 시즌 예상 순위, 가을야구 진출 확률, 포스트시즌 예측, 직관 기록과 응원가를 한곳에서 확인하세요.',
  keywords: [
    '야크크 야르',
    '야구',
    '야구 일정',
    '야구 일정표',
    '야구 캘린더',
    '오늘 야구 일정',
    '오늘 야구 경기',
    '오늘 프로야구',
    '오늘 프로야구 일정',
    'KBO',
    'KBO 일정',
    'KBO 경기 일정',
    'KBO 캘린더',
    'KBO 순위',
    'KBO 팀 순위',
    'KBO 예상 순위',
    'KBO 시즌 예상 순위',
    'KBO 가을야구',
    'KBO 포스트시즌',
    'KBO 플레이오프',
    'KBO 와일드카드',
    'KBO 한국시리즈',
    '프로야구',
    '프로야구 일정',
    '프로야구 일정표',
    '프로야구 캘린더',
    '프로야구 순위',
    '프로야구 예상 순위',
    '시즌 예상 순위',
    '야구 예상 순위',
    '가을야구 확률',
    '포스트시즌 진출 확률',
    '플레이오프 진출 확률',
    '한국시리즈 예측',
    '우승 확률',
    '피타고리안 승률',
    '몬테카를로 시뮬레이션',
    'KBO 선발투수',
    'KBO 라인업',
    '야구 예매',
    '야구장 정보',
    '야구 직관',
    '직관 기록',
    '직관 후기',
    '포토 티켓',
    '승률 기록',
    'KBO 응원가',
    '프로야구 응원가',
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
    title: '야크크 야르 - KBO 일정·시즌 예상 순위·가을야구 확률',
    description:
      'KBO 경기 일정과 프로야구 일정표, 팀 순위, 시즌 예상 순위, 가을야구 확률, 포스트시즌 예측, 직관 기록과 응원가를 함께 확인하세요.',
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
    title: '야크크 야르 - KBO 일정·시즌 예상 순위·가을야구 확률',
    description:
      'KBO 일정, 프로야구 일정표, 야구 캘린더, 시즌 예상 순위, 가을야구 확률과 직관 기록을 함께 확인하세요.',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="ko">
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: bootScript }}
          // 첫 paint 전에 팀 컬러를 root에 미리 세팅하여
          // 디폴트 테마 색이 잠깐 보였다 사라지는 깜빡임을 방지합니다.
        />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializedStructuredData }}
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
