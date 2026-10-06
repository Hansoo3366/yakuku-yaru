import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Game } from '@/lib/baseball-api';
import { formatKoreanDateTime } from '@/lib/date-format';
import {
  fetchPublicGame,
  fetchPublicGameResult,
} from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { GameDetailPageClient } from './GameDetailPageClient';
import { josa } from '@/lib/josa';

export const revalidate = 3600;

type GamePageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

function parseGameId(value: string) {
  const gameId = Number(value);

  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

function hasScore(game: Game) {
  return (
    typeof game.awayScore === 'number' && typeof game.homeScore === 'number'
  );
}

function buildGameTitle(game: Game) {
  const matchup = `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`;
  const score = hasScore(game) ? ` ${game.awayScore} : ${game.homeScore}` : '';

  return `${matchup}${score} - ${formatKoreanDateTime(game.gameDate)} KBO 경기`;
}

function buildGameDescription(game: Game) {
  const matchup = `${josa(game.awayTeam.name, '과')} ${game.homeTeam.name}`;
  const score = hasScore(game)
    ? `스코어는 ${game.awayTeam.shortName} ${game.awayScore}, ${game.homeTeam.shortName} ${game.homeScore}입니다. `
    : '';

  return `${formatKoreanDateTime(game.gameDate)} ${game.stadium}에서 열리는 ${matchup} 경기 정보입니다. ${score}선발 투수, 라인업, 예매 정보와 구장 정보를 확인하세요.`;
}

function buildGameKeywords(game: Game) {
  return [
    `${game.awayTeam.shortName} ${game.homeTeam.shortName}`,
    `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`,
    `${game.awayTeam.name} ${game.homeTeam.name}`,
    `${game.awayTeam.shortName} 경기`,
    `${game.homeTeam.shortName} 경기`,
    `${game.homeTeam.shortName} 홈경기`,
    `${game.stadium} 야구`,
    'KBO 경기',
    'KBO 경기 일정',
    '오늘 야구 경기',
    '프로야구 경기',
    '프로야구 스코어',
    'KBO 스코어',
    'KBO 선발투수',
    'KBO 라인업',
    '야구 예매',
    '야구장 정보',
  ];
}

/** 검색·AI 가 경기를 구조화된 데이터로 읽을 수 있게 schema.org SportsEvent 로 표현한다. */
/** KBO 경기는 보통 3시간 안팎이라, 끝난 시각 정보가 없으니 시작 3시간 30분 뒤를 종료로 본다. */
const TYPICAL_GAME_DURATION_MS = 3.5 * 60 * 60 * 1000;

function buildGameJsonLd(game: Game) {
  const url = getAbsoluteUrl(`/games/${game.id}`);
  const startedAt = new Date(game.gameDate);
  const endDate = new Date(
    startedAt.getTime() + TYPICAL_GAME_DURATION_MS,
  ).toISOString();
  const isUpcoming = game.status !== 'cancelled' && startedAt > new Date();
  const team = (item: Game['homeTeam']) => ({
    '@type': 'SportsTeam',
    name: item.name,
    alternateName: item.shortName,
    sport: 'Baseball',
    logo: getAbsoluteUrl(getTeamLogoSrc(item)),
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${game.awayTeam.name} vs ${game.homeTeam.name}`,
    description: buildGameDescription(game),
    sport: 'Baseball',
    startDate: game.gameDate,
    endDate,
    url,
    image: [getAbsoluteUrl('/main_kv.jpg')],
    eventStatus:
      game.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'StadiumOrArena',
      name: game.stadium,
      address: { '@type': 'PostalAddress', addressCountry: 'KR' },
    },
    homeTeam: team(game.homeTeam),
    awayTeam: team(game.awayTeam),
    competitor: [team(game.awayTeam), team(game.homeTeam)],
    performer: [team(game.awayTeam), team(game.homeTeam)],
    organizer: {
      '@type': 'SportsOrganization',
      name: 'KBO 리그',
      url: 'https://www.koreabaseball.com',
    },
    // 예매 정보는 앞으로 열리는 경기에만 뜻이 있다. 가격은 구단·좌석마다 달라 적지 않는다.
    ...(isUpcoming && game.ticketUrl
      ? {
          offers: {
            '@type': 'Offer',
            url: game.ticketUrl,
            availability: 'https://schema.org/InStock',
            ...(game.ticketOpenAt ? { validFrom: game.ticketOpenAt } : {}),
          },
        }
      : {}),
    ...(hasScore(game)
      ? {
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: `${game.awayTeam.shortName} 득점`,
              value: game.awayScore,
            },
            {
              '@type': 'PropertyValue',
              name: `${game.homeTeam.shortName} 득점`,
              value: game.homeScore,
            },
          ],
        }
      : {}),
  };
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { gameId } = await params;
  const numericGameId = parseGameId(gameId);
  const canonical = `/games/${gameId}`;

  if (!numericGameId) {
    return {
      title: 'KBO 경기 정보',
      description: 'KBO 경기 일정, 스코어, 선발 투수와 라인업을 확인하세요.',
      keywords: [
        'KBO 경기',
        'KBO 경기 일정',
        '프로야구 경기',
        '오늘 야구 경기',
        'KBO 선발투수',
        'KBO 라인업',
      ],
      alternates: {
        canonical,
      },
    };
  }

  const game = await fetchPublicGame(numericGameId);

  if (!game) {
    return {
      title: 'KBO 경기 정보',
      description: 'KBO 경기 일정, 스코어, 선발 투수와 라인업을 확인하세요.',
      keywords: [
        'KBO 경기',
        'KBO 경기 일정',
        '프로야구 경기',
        '오늘 야구 경기',
        'KBO 선발투수',
        'KBO 라인업',
      ],
      alternates: {
        canonical,
      },
    };
  }

  const title = buildGameTitle(game);
  const description = buildGameDescription(game);

  return {
    title,
    description,
    keywords: buildGameKeywords(game),
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      siteName: '야크크 야르',
      locale: 'ko_KR',
      images: [
        {
          url: getAbsoluteUrl('/main_kv.jpg'),
          width: 1200,
          height: 630,
          alt: `${game.awayTeam.shortName} vs ${game.homeTeam.shortName} KBO 경기`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [getAbsoluteUrl('/main_kv.jpg')],
    },
  };
}

export default async function GameDetailPage({ params }: GamePageProps) {
  const { gameId } = await params;
  const numericGameId = parseGameId(gameId);

  if (!numericGameId) {
    notFound();
  }

  // generateMetadata 와 같은 요청이라 한 번만 나간다.
  const { game, missing } = await fetchPublicGameResult(numericGameId);

  // 없는 경기는 빈 화면 대신 404 로 응답한다. (일시적인 API 실패는 클라이언트 조회로 넘긴다)
  if (missing) {
    notFound();
  }

  return (
    <>
      {game ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildGameJsonLd(game)).replace(
              /</g,
              '\\u003c',
            ),
          }}
          type="application/ld+json"
        />
      ) : null}
      <GameDetailPageClient gameId={numericGameId} initialGame={game} />
    </>
  );
}
