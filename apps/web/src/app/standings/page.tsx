import type { Metadata } from 'next';
import Link from 'next/link';
import { SeasonProjectionTable } from '@/components/SeasonProjectionTable';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import { getKoreaDateString } from '@/lib/date-format';
import {
  fetchPublicSeasonProjection,
  fetchPublicStandings,
  getKoreaSeasonYear,
} from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import styles from '../data-page.module.css';

/**
 * KBO 팀 순위와 시즌 예상 순위만 모은 페이지.
 * 홈에도 같은 표가 있지만, "KBO 순위"를 찾는 검색·AI 가 바로 닿을 수 있는 전용 주소를 둔다.
 */
export const metadata: Metadata = {
  title: 'KBO 팀 순위 - 프로야구 순위표와 가을야구 확률',
  description:
    'KBO 프로야구 팀 순위, 승·패·무, 승률, 게임차, 최근 10경기와 시즌 예상 순위, 가을야구 진출 확률을 확인하세요.',
  alternates: { canonical: '/standings' },
};

export default async function StandingsPage() {
  const seasonYear = getKoreaSeasonYear();
  const [standings, projection] = await Promise.all([
    fetchPublicStandings(seasonYear),
    fetchPublicSeasonProjection(seasonYear),
  ]);
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

      <section aria-label="팀 순위" className={styles.panel}>
        <TeamStandingsTable standings={standings} />
      </section>

      <SeasonProjectionTable projection={projection} />
    </main>
  );
}
