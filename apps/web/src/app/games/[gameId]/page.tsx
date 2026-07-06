import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Game } from '@/lib/baseball-api';
import { formatKoreanDateTime } from '@/lib/date-format';
import { fetchPublicGame } from '@/lib/server-baseball-api';
import { getAbsoluteUrl } from '@/lib/site-url';
import { GameDetailPageClient } from './GameDetailPageClient';

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
  return typeof game.awayScore === 'number' && typeof game.homeScore === 'number';
}

function buildGameTitle(game: Game) {
  const matchup = `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`;
  const score = hasScore(game)
    ? ` ${game.awayScore} : ${game.homeScore}`
    : '';

  return `${matchup}${score} - ${formatKoreanDateTime(game.gameDate)} KBO 경기`;
}

function buildGameDescription(game: Game) {
  const matchup = `${game.awayTeam.name}와 ${game.homeTeam.name}`;
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
          url: getAbsoluteUrl('/main_kv.png'),
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
      images: [getAbsoluteUrl('/main_kv.png')],
    },
  };
}

export default async function GameDetailPage({ params }: GamePageProps) {
  const { gameId } = await params;
  const numericGameId = parseGameId(gameId);

  if (!numericGameId) {
    notFound();
  }

  return <GameDetailPageClient gameId={numericGameId} />;
}
