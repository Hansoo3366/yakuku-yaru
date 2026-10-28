import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PostseasonBracket,
  summarizePostseason,
} from '@/components/PostseasonBracket';
import { SeasonProjectionTable } from '@/components/SeasonProjectionTable';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getKoreaDateString } from '@/lib/date-format';
import type { PostseasonBracket as PostseasonBracketData } from '@/lib/baseball-api';
import {
  fetchPublicPostseason,
  fetchPublicSeasonProjection,
  fetchPublicStandings,
  getKoreaSeasonYear,
} from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import styles from '../data-page.module.css';

/** 포스트시즌 시리즈를 SportsEvent 로 적어 검색·AI 가 대진과 전적을 읽게 한다 */
function buildPostseasonJsonLd(bracket: PostseasonBracketData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${bracket.seasonYear} KBO 포스트시즌`,
    description: summarizePostseason(bracket),
    sport: 'Baseball',
    url: getAbsoluteUrl('/standings'),
    organizer: {
      '@type': 'SportsOrganization',
      name: 'KBO 리그',
      url: 'https://www.koreabaseball.com',
    },
    subEvent: bracket.rounds
      .filter((round) => round.higher && round.lower)
      .map((round) => ({
        '@type': 'SportsEvent',
        name: `${bracket.seasonYear} KBO ${round.name}`,
        sport: 'Baseball',
        ...(round.games[0] ? { startDate: round.games[0].gameDate } : {}),
        competitor: [round.higher, round.lower].map((team) => ({
          '@type': 'SportsTeam',
          name: team?.name,
          alternateName: team?.shortName,
        })),
        description: `${round.higher?.shortName} ${round.higherWins}승, ${round.lower?.shortName} ${round.lowerWins}승${round.draws ? `, 무승부 ${round.draws}` : ''}`,
        subEvent: round.games.map((game, index) => ({
          '@type': 'SportsEvent',
          name: `${round.name} ${index + 1}차전 ${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`,
          startDate: game.gameDate,
          url: getAbsoluteUrl(`/games/${game.id}`),
        })),
      })),
  };
}

/**
 * KBO 팀 순위와 시즌 예상 순위만 모은 페이지.
 * 홈에도 같은 표가 있지만, "KBO 순위"를 찾는 검색·AI 가 바로 닿을 수 있는 전용 주소를 둔다.
 */
export const metadata: Metadata = {
  title: 'KBO 팀 순위 - 프로야구 순위표, 포스트시즌 대진표와 가을야구 확률',
  description:
    'KBO 프로야구 팀 순위, 승·패·무, 승률, 게임차, 최근 10경기와 포스트시즌 대진표·시리즈 전적, 시즌 예상 순위, 가을야구 진출 확률을 확인하세요.',
  keywords: [
    'KBO 순위',
    '프로야구 순위',
    'KBO 팀 순위',
    'KBO 포스트시즌',
    'KBO 포스트시즌 대진표',
    '가을야구',
    '와일드카드 결정전',
    '준플레이오프',
    '플레이오프',
    '한국시리즈',
    '가을야구 확률',
  ],
  alternates: { canonical: '/standings' },
};

export default async function StandingsPage() {
  const seasonYear = getKoreaSeasonYear();
  const [standings, projection, postseason] = await Promise.all([
    fetchPublicStandings(seasonYear),
    fetchPublicSeasonProjection(seasonYear),
    fetchPublicPostseason(seasonYear),
  ]);
  const activePostseason = postseason?.active ? postseason : null;
  const jsonLd = standings?.items.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${standings.seasonYear} KBO 팀 순위`,
        url: getAbsoluteUrl('/standings'),
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: standings.items.map((item) => ({
          '@type': 'ListItem',
          position: item.rank,
          item: {
            '@type': 'SportsTeam',
            name: item.teamName,
            sport: 'Baseball',
            description: `${item.games}경기 ${item.wins}승 ${item.losses}패 ${item.draws}무`,
          },
        })),
      }
    : null;

  return (
    <main className={`app-shell ${styles.page}`}>
      {jsonLd ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
      ) : null}
      {activePostseason ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildPostseasonJsonLd(activePostseason)).replace(
              /</g,
              '\\u003c',
            ),
          }}
          type="application/ld+json"
        />
      ) : null}
      <header className={styles.head}>
        <h1>{seasonYear} KBO 팀 순위</h1>
        <p>
          매일 갱신되는 KBO 리그 순위입니다. 아래에는 남은 일정을 시뮬레이션한
          시즌 예상 순위와 가을야구 진출 확률이 있습니다.
        </p>
        <nav aria-label="관련 페이지" className={styles.links}>
          <Link href={`/schedule/${getKoreaDateString().slice(0, 7)}`}>
            이번 달 경기 일정·결과
          </Link>
          <Link href="/calendar">캘린더로 보기</Link>
        </nav>
      </header>

      {activePostseason ? (
        <section aria-labelledby="postseason-title" className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 id="postseason-title">{activePostseason.seasonYear} 포스트시즌 대진</h2>
            <p>{summarizePostseason(activePostseason)}</p>
          </div>
          <PostseasonBracket bracket={activePostseason} />
        </section>
      ) : null}

      <section aria-label="팀 순위" className={styles.panel}>
        <TeamStandingsTable standings={standings} />
      </section>

      <SeasonProjectionTable projection={projection} />
    </main>
  );
}
