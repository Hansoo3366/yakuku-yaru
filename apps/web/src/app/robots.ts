import type { MetadataRoute } from 'next';
import { getAbsoluteUrl, getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/attendance',
        '/forgot-password',
        '/login',
        '/me',
        '/offline',
        '/register',
        '/reset-password',
        '/verify-email',
      ],
    },
    sitemap: getAbsoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  };
}
