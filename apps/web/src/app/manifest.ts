import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '야크크 야르~ 섹시야구',
    short_name: '야크크 야르',
    description:
      'KBO 일정, 야구 캘린더, 가을야구 확률, 직관과 집관 기록을 함께 확인하세요.',
    start_url: '/calendar',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfaf6',
    theme_color: '#14213d',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
