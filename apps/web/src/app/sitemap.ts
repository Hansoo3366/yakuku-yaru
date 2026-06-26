import type { MetadataRoute } from 'next';
import { getAbsoluteUrl } from '@/lib/site-url';

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/calendar', changeFrequency: 'daily', priority: 0.9 },
  { path: '/posts', changeFrequency: 'daily', priority: 0.8 },
  { path: '/cheers', changeFrequency: 'weekly', priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return staticRoutes.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
