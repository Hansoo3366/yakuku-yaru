import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { BoxScore, Game } from '@/lib/baseball-api';
import { getBoxScoreHighlights } from '@/lib/box-score-terms';
import { formatKoreanDateTime, formatKoreanMonthDay } from '@/lib/date-format';
import {
  fetchPublicBoxScore,
  fetchPublicGame,
  fetchPublicGameResult,
  fetchPublicPostseason,
  findPostseasonGame,
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

/** 경기 당일에는 시작 전부터 0:0, 경기 중에는 진행 점수가 들어오니 끝난 경기만 결과로 쓴다 */
function hasFinalScore(game: Game) {
  return (
    game.status === 'finished' &&
    typeof game.awayScore === 'number' &&
    typeof game.homeScore === 'number'
  );
}

type GameExtras = {
  /** 포스트시즌 경기면 시리즈 이름과 몇 차전인지 */
  postseason: { seasonYear: number; roundName: string; gameNumber: number } | null;
  boxScore: BoxScore | null;
};

/** 포스트시즌 회차와 끝난 경기 기록을 함께 받는다. 둘 다 캐시된 조회라 메타데이터와 본문이 같은 응답을 쓴다. */
async function loadGameExtras(game: Game): Promise<GameExtras> {
  const seasonYear = Number(game.gameDate.slice(0, 4));
  const [bracket, boxScore] = await Promise.all([
    fetchPublicPostseason(seasonYear),
    game.status === 'finished' ? fetchPublicBoxScore(game.id) : Promise.resolve(null),
  ]);
  const found = findPostseasonGame(bracket, game.id);

  return {
    postseason: found
      ? { seasonYear, roundName: found.round.name, gameNumber: found.gameNumber }
      : null,
    boxScore,
  };
}

function postseasonLabel(extras: GameExtras) {
  return extras.postseason
    ? `${extras.postseason.roundName} ${extras.postseason.gameNumber}차전`
    : null;
}

function buildGameTitle(game: Game, extras: GameExtras) {
  const matchup = `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`;
  const score = hasFinalScore(game) ? ` ${game.awayScore} : ${game.homeScore}` : '';
  const label = postseasonLabel(extras);

  // 포스트시즌은 "플레이오프 1차전"으로 찾으니 회차를 앞에 두고 날짜는 짧게 쓴다.
  return label
    ? `${matchup}${score} - ${extras.postseason?.seasonYear} ${label} (${formatKoreanMonthDay(game.gameDate)}) KBO 경기`
    : `${matchup}${score} - ${formatKoreanDateTime(game.gameDate)} KBO 경기`;
}

/** "KIA가 5:1로 이겼어요. 승리 투수 이의리, 패전 투수 페덱." 같은 한두 문장 */
function describeResult(game: Game, boxScore: BoxScore | null) {
  if (!hasFinalScore(game)) return '';

  const awayScore = game.awayScore as number;
  const homeScore = game.homeScore as number;
  const result =
    awayScore === homeScore
      ? `${josa(game.awayTeam.shortName, '과')} ${josa(game.homeTeam.shortName, '이')} ${awayScore}:${homeScore}로 비겼습니다. `
      : `${josa(
          awayScore > homeScore ? game.awayTeam.shortName : game.homeTeam.shortName,
          '이',
        )} ${Math.max(awayScore, homeScore)}:${Math.min(awayScore, homeScore)}로 이겼습니다. `;

  if (!boxScore) return result;

  const highlights = getBoxScoreHighlights(boxScore);
  const pitchers = [
    highlights.winningPitcher ? `승리 투수 ${highlights.winningPitcher.name}` : null,
    highlights.losingPitcher ? `패전 투수 ${highlights.losingPitcher.name}` : null,
    highlights.savePitcher ? `세이브 ${highlights.savePitcher.name}` : null,
  ].filter(Boolean);
  const winningHit = highlights.winningHit
    ? ` 결승타는 ${highlights.winningHit.name}${highlights.winningHit.detail ? `(${highlights.winningHit.detail})` : ''}.`
    : '';

  return `${result}${pitchers.length ? `${pitchers.join(', ')}.` : ''}${winningHit} `;
}

function buildGameDescription(game: Game, extras: GameExtras) {
  const matchup = `${josa(game.awayTeam.name, '과')} ${game.homeTeam.name}`;
  const label = postseasonLabel(extras);
  const isPast = hasFinalScore(game) || new Date(game.gameDate) < new Date();
  const where = `${formatKoreanDateTime(game.gameDate)} ${game.stadium}에서 ${isPast ? '열린' : '열리는'}`;
  const what = label ? `${extras.postseason?.seasonYear} ${label} ${matchup}` : matchup;

  if (extras.boxScore) {
    return `${where} ${what} 경기 결과입니다. ${describeResult(game, extras.boxScore)}이닝별 득점과 타자·투수 기록을 확인하세요.`;
  }

  return `${where} ${what} 경기 정보입니다. ${describeResult(game, null)}선발 투수, 라인업, 예매 정보와 구장 정보를 확인하세요.`;
}

function buildGameKeywords(game: Game, extras: GameExtras) {
  const away = game.awayTeam.shortName;
  const home = game.homeTeam.shortName;
  const postseason = extras.postseason;
  const highlights = extras.boxScore ? getBoxScoreHighlights(extras.boxScore) : null;

  return [
    `${away} ${home}`,
    `${away} vs ${home}`,
    `${game.awayTeam.name} ${game.homeTeam.name}`,
    `${away} 경기`,
    `${home} 경기`,
    `${home} 홈경기`,
    `${game.stadium} 야구`,
    ...(postseason
      ? [
          `${postseason.seasonYear} ${postseason.roundName}`,
          `${postseason.roundName} ${postseason.gameNumber}차전`,
          `${postseason.seasonYear} ${postseason.roundName} ${postseason.gameNumber}차전`,
          `${away} ${home} ${postseason.roundName}`,
          'KBO 포스트시즌',
          '가을야구',
        ]
      : []),
    ...(extras.boxScore
      ? [
          `${away} ${home} 경기 결과`,
          `${away} ${home} 박스스코어`,
          'KBO 박스스코어',
          'KBO 경기 기록',
          'KBO 경기 결과',
        ]
      : []),
    ...[highlights?.winningPitcher?.name, highlights?.losingPitcher?.name]
      .filter((name): name is string => Boolean(name)),
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

function buildGameJsonLd(game: Game, extras: GameExtras) {
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

  const label = postseasonLabel(extras);
  const highlights = extras.boxScore ? getBoxScoreHighlights(extras.boxScore) : null;
  const property = (name: string, value: string | number | null | undefined) =>
    value === null || value === undefined || value === ''
      ? []
      : [{ '@type': 'PropertyValue', name, value }];
  const properties = [
    ...(hasFinalScore(game)
      ? [
          ...property(`${game.awayTeam.shortName} 득점`, game.awayScore),
          ...property(`${game.homeTeam.shortName} 득점`, game.homeScore),
        ]
      : []),
    ...property('승리 투수', highlights?.winningPitcher?.name),
    ...property('패전 투수', highlights?.losingPitcher?.name),
    ...property('세이브 투수', highlights?.savePitcher?.name),
    ...property(
      '결승타',
      highlights?.winningHit
        ? `${highlights.winningHit.name}${highlights.winningHit.detail ? ` (${highlights.winningHit.detail})` : ''}`
        : null,
    ),
    ...property('홈런', highlights?.homeRuns),
    ...property('관중', extras.boxScore?.crowd),
    ...property('경기 시간', extras.boxScore?.duration),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${label ? `${extras.postseason?.seasonYear} ${label} ` : ''}${game.awayTeam.name} vs ${game.homeTeam.name}`,
    description: buildGameDescription(game, extras),
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
    ...(extras.postseason
      ? {
          superEvent: {
            '@type': 'SportsEvent',
            name: `${extras.postseason.seasonYear} KBO ${extras.postseason.roundName}`,
            sport: 'Baseball',
          },
        }
      : {}),
    ...(properties.length ? { additionalProperty: properties } : {}),
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

  const extras = await loadGameExtras(game);
  const title = buildGameTitle(game, extras);
  const description = buildGameDescription(game, extras);

  return {
    title,
    description,
    keywords: buildGameKeywords(game, extras),
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

  const extras = game ? await loadGameExtras(game) : null;

  return (
    <>
      {game ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildGameJsonLd(game, extras ?? { postseason: null, boxScore: null })).replace(
              /</g,
              '\\u003c',
            ),
          }}
          type="application/ld+json"
        />
      ) : null}
      <GameDetailPageClient
        gameId={numericGameId}
        initialBoxScore={extras?.boxScore ?? null}
        initialGame={game}
        postseasonLabel={extras ? postseasonLabel(extras) : null}
      />
    </>
  );
}
