import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '야크크 야르~ 섹시야구',
    short_name: '야크크 야르',
    description: 'KBO 직관과 집관을 캘린더와 포토 티켓으로 기록하는 야구 팬 PWA',
    start_url: '/calendar',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfaf6',
    theme_color: '#14213d',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/main_icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/main_icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
