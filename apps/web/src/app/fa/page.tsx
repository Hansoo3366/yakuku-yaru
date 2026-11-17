import type { Metadata } from 'next';
import Link from 'next/link';
import { FreeAgentBoard } from '@/components/StoveLeague';
import type { FreeAgent } from '@/lib/baseball-api';
import { formatFreeAgentDeal } from '@/lib/fa-amount';
import { getPlayerProfileImageSrc } from '@/lib/player-image';
import {
  fetchPublicFreeAgents,
  fetchPublicStandings,
} from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import styles from '../data-page.module.css';

/** 선수 한 명의 현재 상태: "미계약" / "LG 잔류 4년 50억" / "SSG → KT 이적" */
function describeFreeAgent(freeAgent: FreeAgent) {
  if (!freeAgent.newTeam) {
    return '미계약';
  }

  const deal = formatFreeAgentDeal(freeAgent);
  const move =
    freeAgent.newTeam.id === freeAgent.previousTeam.id
      ? `${freeAgent.newTeam.shortName} 잔류`
      : `${freeAgent.previousTeam.shortName} → ${freeAgent.newTeam.shortName} 이적`;

  return deal ? `${move} ${deal}` : move;
}

function summarize(items: FreeAgent[]) {
  const signed = items.filter((item) => item.newTeam).length;
  const moved = items.filter(
    (item) => item.newTeam && item.newTeam.id !== item.previousTeam.id,
  ).length;

  return { total: items.length, signed, moved, open: items.length - signed };
}

/**
 * "2026 FA 명단"을 찾는 검색·AI 가 바로 닿는 전용 주소.
 * 홈에도 같은 목록이 있지만, 스토브리그가 끝나도 이 주소는 가장 최근 FA 를 계속 보여 준다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchPublicFreeAgents();
  const faYear = data?.faYear;

  if (!faYear || !data?.items.length) {
    return {
      title: 'KBO FA 명단·계약 현황',
      description:
        'KBO 프로야구 FA 자격 선수 명단과 계약 결과(잔류·이적, 계약 기간과 금액)를 팀별로 정리합니다.',
      alternates: { canonical: '/fa' },
    };
  }

  const count = summarize(data.items);

  return {
    title: `${faYear} KBO FA 명단·계약 현황 - 팀별 FA 자격 선수, 이적·잔류, 계약 금액`,
    description: `${faYear} 스토브리그 KBO FA 자격 선수 ${count.total}명의 계약 현황입니다. 계약 ${count.signed}명(이적 ${count.moved}명), 미계약 ${count.open}명. 팀별 명단과 계약 기간, 총액, 계약금, 연봉, 옵션을 확인하세요.`,
    keywords: [
      `${faYear} FA`,
      `${faYear} KBO FA`,
      'KBO FA',
      '프로야구 FA',
      'FA 명단',
      'FA 계약',
      'FA 이적',
      '스토브리그',
      ...[...new Set(data.items.map((item) => item.playerName))].slice(0, 12),
    ],
    alternates: { canonical: '/fa' },
  };
}

export default async function FreeAgentsPage() {
  const data = await fetchPublicFreeAgents();
  const faYear = data?.faYear ?? null;
  const items = data?.items ?? [];
  const standings = faYear ? await fetchPublicStandings(faYear) : null;
  const count = summarize(items);
  const jsonLd =
    faYear && items.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${faYear} KBO FA 명단`,
          url: getAbsoluteUrl('/fa'),
          numberOfItems: items.length,
          itemListElement: items.map((freeAgent, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Person',
              name: freeAgent.playerName,
              jobTitle: `프로야구 선수 (${freeAgent.position})`,
              ...(freeAgent.profileImageUrl
                ? { image: getPlayerProfileImageSrc(freeAgent.profileImageUrl) }
                : {}),
              memberOf: {
                '@type': 'SportsTeam',
                name: (freeAgent.newTeam ?? freeAgent.previousTeam).name,
                sport: 'Baseball',
              },
              description: `${freeAgent.previousTeam.name} 소속 ${faYear} FA · ${describeFreeAgent(freeAgent)}`,
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
        <h1>
          {faYear ? `${faYear} KBO FA 명단·계약 현황` : 'KBO FA 명단·계약 현황'}
        </h1>
        <p>
          {faYear && items.length
            ? `FA 자격을 얻은 ${count.total}명 중 ${count.signed}명이 계약했고(이적 ${count.moved}명), ${count.open}명이 미계약입니다. 명단과 계약 팀은 매일 KBO 선수 이동현황에서 받고, 계약 기간과 금액은 구단 발표를 따릅니다.`
            : 'FA 명단은 정규시즌이 끝난 11월에 KBO가 공시하면 이곳에 올라옵니다.'}
        </p>
        <nav aria-label="관련 페이지" className={styles.links}>
          <Link href="/">홈</Link>
          <Link href="/standings">KBO 팀 순위</Link>
          <Link href="/calendar">경기 일정</Link>
        </nav>
      </header>

      {faYear && items.length ? (
        <FreeAgentBoard
          faYear={faYear}
          hideTitle
          items={items}
          standings={standings}
        />
      ) : null}
    </main>
  );
}
