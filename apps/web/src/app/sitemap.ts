import type { MetadataRoute } from 'next';
import { listPublicSeasonGames } from '@/lib/server-baseball-api';
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

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const seasonYear = lastModified.getFullYear();
  const gamesBySeason = await Promise.all([
    listPublicSeasonGames(seasonYear),
    listPublicSeasonGames(seasonYear - 1),
  ]);
  const games = [
    ...new Map(
      gamesBySeason.flat().map((game) => [game.id, game] as const),
    ).values(),
  ];
  const gameRoutes = games.map((game) => ({
    url: getAbsoluteUrl(`/games/${game.id}`),
    lastModified:
      game.status === 'finished' ? new Date(game.gameDate) : lastModified,
    changeFrequency:
      game.status === 'finished'
        ? ('monthly' as const)
        : ('daily' as const),
    priority: game.status === 'finished' ? 0.6 : 0.7,
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: getAbsoluteUrl(route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...gameRoutes,
  ];
}
