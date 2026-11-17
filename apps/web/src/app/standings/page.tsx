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

/**
 * 포스트시즌 대진과 시리즈 전적을 목록으로 적어 검색·AI 가 읽게 한다.
 * 시리즈·포스트시즌 전체는 한 구장·한 시각이 아니어서 Event 로 적으면 startDate·location 누락 오류가 난다.
 * 경기 하나하나의 SportsEvent 는 각 경기 페이지(/games/{id})가 맡고, 여기서는 그 주소만 잇는다.
 */
function buildPostseasonJsonLd(bracket: PostseasonBracketData) {
  const rounds = bracket.rounds.filter((round) => round.higher && round.lower);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${bracket.seasonYear} KBO 포스트시즌`,
    description: summarizePostseason(bracket),
    url: getAbsoluteUrl('/standings'),
    numberOfItems: rounds.length,
    itemListElement: rounds.map((round, roundIndex) => ({
      '@type': 'ListItem',
      position: roundIndex + 1,
      item: {
        '@type': 'ItemList',
        name: `${bracket.seasonYear} KBO ${round.name}`,
        description: `${round.higher?.name} ${round.higherWins}승, ${round.lower?.name} ${round.lowerWins}승${round.draws ? `, 무승부 ${round.draws}` : ''}`,
        numberOfItems: round.games.length,
        itemListElement: round.games.map((game, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${round.name} ${index + 1}차전 ${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`,
          url: getAbsoluteUrl(`/games/${game.id}`),
        })),
      },
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
        name: `${standings.seasonYear} KBO 정규시즌 순위`,
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

      <section aria-labelledby="regular-season-title" className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 id="regular-season-title">정규시즌 순위</h2>
          <p>
            {activePostseason
              ? '144경기 승률로 매긴 순위예요. 포스트시즌 결과는 위 대진에 따로 있어요.'
              : '144경기 승률로 매긴 순위예요.'}
          </p>
        </div>
        <TeamStandingsTable standings={standings} />
      </section>

      <SeasonProjectionTable projection={projection} />
    </main>
  );
}
