import { getKoreaDateString } from '@/lib/date-format';
import {
  fetchPublicFreeAgents,
  fetchPublicPostseason,
  fetchPublicSeasonProjection,
  fetchPublicStandings,
  resolveHomeSeason,
  listPublicGames,
  listPublicTeams,
} from '@/lib/server-baseball-api';
import type { Metadata } from 'next';
import { HomePageClient } from './HomePageClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

/**
 * 순위·예상 순위·가까운 경기 일정·스토브리그 FA 를 서버에서 먼저 받아 첫 HTML 에 담는다.
 * JS 를 실행하지 않는 검색·AI 크롤러도 실제 데이터를 읽을 수 있고,
 * 방문자는 로딩 문구 대신 바로 내용을 본다.
 */
export default async function HomePage() {
  const { seasonYear, stoveLeague } = await resolveHomeSeason();
  const gamesRange = {
    from: getKoreaDateString(),
    to: getKoreaDateString(new Date(), 7),
  };
  const [
    initialStandings,
    initialProjection,
    initialGames,
    initialPostseason,
    initialFreeAgents,
    initialTeams,
  ] = await Promise.all([
    fetchPublicStandings(seasonYear),
    fetchPublicSeasonProjection(seasonYear),
    listPublicGames(gamesRange),
    fetchPublicPostseason(seasonYear),
    fetchPublicFreeAgents(),
    listPublicTeams(),
  ]);

  return (
    <HomePageClient
      gamesRange={gamesRange}
      initialFreeAgents={initialFreeAgents}
      initialGames={initialGames}
      initialPostseason={initialPostseason}
      initialProjection={initialProjection}
      initialStandings={initialStandings}
      initialTeams={initialTeams}
      seasonYear={seasonYear}
      stoveLeague={stoveLeague}
    />
  );
}
