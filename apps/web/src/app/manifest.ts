import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yakuku Yaru',
    short_name: 'Yakuku',
    description: '야구 직관 기록 캘린더',
    start_url: '/calendar',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfaf6',
    theme_color: '#0f6b4f',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
