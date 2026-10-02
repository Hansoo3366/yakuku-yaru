import { getKoreaDateString } from '@/lib/date-format';
import {
  fetchPublicSeasonProjection,
  fetchPublicStandings,
  getKoreaSeasonYear,
  listPublicGames,
} from '@/lib/server-baseball-api';
import { HomePageClient } from './HomePageClient';

/**
 * 순위·예상 순위·가까운 경기 일정을 서버에서 먼저 받아 첫 HTML 에 담는다.
 * JS 를 실행하지 않는 검색·AI 크롤러도 실제 데이터를 읽을 수 있고,
 * 방문자는 로딩 문구 대신 바로 내용을 본다.
 */
export default async function HomePage() {
  const seasonYear = getKoreaSeasonYear();
  const gamesRange = {
    from: getKoreaDateString(),
    to: getKoreaDateString(new Date(), 7),
  };
  const [initialStandings, initialProjection, initialGames] = await Promise.all(
    [
      fetchPublicStandings(seasonYear),
      fetchPublicSeasonProjection(seasonYear),
      listPublicGames(gamesRange),
    ],
  );

  return (
    <HomePageClient
      gamesRange={gamesRange}
      initialGames={initialGames}
      initialProjection={initialProjection}
      initialStandings={initialStandings}
      seasonYear={seasonYear}
    />
  );
}
