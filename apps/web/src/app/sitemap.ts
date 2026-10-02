import type { MetadataRoute } from 'next';
import { getKoreaDateString } from '@/lib/date-format';
import {
  listPublicPlayersWithCheer,
  listPublicPosts,
  listPublicSeasonGames,
  listPublicStadiums,
} from '@/lib/server-baseball-api';
import { getStadiumPath } from '@/lib/stadium-note-api';
import { getAbsoluteUrl } from '@/lib/site-url';

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/calendar', changeFrequency: 'daily', priority: 0.9 },
  { path: '/standings', changeFrequency: 'daily', priority: 0.9 },
  { path: '/posts', changeFrequency: 'daily', priority: 0.8 },
  { path: '/fans', changeFrequency: 'daily', priority: 0.7 },
  { path: '/stadiums', changeFrequency: 'daily', priority: 0.7 },
  { path: '/cheers', changeFrequency: 'weekly', priority: 0.7 },
];

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const seasonYear = lastModified.getFullYear();
  const [gamesBySeason, cheerPlayers, posts, stadiums] = await Promise.all([
    Promise.all([
      listPublicSeasonGames(seasonYear),
      listPublicSeasonGames(seasonYear - 1),
    ]),
    listPublicPlayersWithCheer(),
    listPublicPosts(),
    listPublicStadiums(),
  ]);
  const postRoutes = posts.map((post) => ({
    url: getAbsoluteUrl(`/posts/${post.id}`),
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));
  const stadiumRoutes = stadiums.map((stadium) => ({
    url: getAbsoluteUrl(getStadiumPath(stadium.stadium)),
    lastModified: stadium.lastNoteAt
      ? new Date(stadium.lastNoteAt)
      : lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  // 가사를 페이지로 읽을 수 있게 선수별 응원가 주소를 넣는다.
  const cheerRoutes = cheerPlayers.map((player) => ({
    url: getAbsoluteUrl(`/cheers/${player.playerId}`),
    lastModified: player.cheerUpdatedAt
      ? new Date(player.cheerUpdatedAt)
      : lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));
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
      game.status === 'finished' ? ('monthly' as const) : ('daily' as const),
    priority: game.status === 'finished' ? 0.6 : 0.7,
  }));

  // 경기가 있는 달마다 월별 일정표 주소를 넣는다.
  const currentMonth = getKoreaDateString().slice(0, 7);
  const scheduleMonths = [
    ...new Set([
      currentMonth,
      ...games.map((game) => getKoreaDateString(game.gameDate).slice(0, 7)),
    ]),
  ].sort();
  const scheduleRoutes = scheduleMonths.map((month) => ({
    url: getAbsoluteUrl(`/schedule/${month}`),
    lastModified,
    changeFrequency:
      month >= currentMonth ? ('daily' as const) : ('monthly' as const),
    priority: month === currentMonth ? 0.9 : 0.6,
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: getAbsoluteUrl(route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...scheduleRoutes,
    ...stadiumRoutes,
    ...postRoutes,
    ...cheerRoutes,
    ...gameRoutes,
  ];
}
