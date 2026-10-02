'use client';

/* eslint-disable @next/next/no-img-element */

import './public-home.css';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { SeasonProjectionTable } from '@/components/SeasonProjectionTable';
import { TeamStandingsTable } from '@/components/TeamStandingsTable';
import type {
  Game,
  SeasonProjectionResponse,
  TeamStandingsResponse,
} from '@/lib/baseball-api';
import {
  formatKoreanMonthDay,
  formatKoreanTime,
  formatKoreanWeekday,
  getKoreaDateString,
} from '@/lib/date-format';
import { getCancellationLabel } from '@/lib/game-cancellation';
import { getGameStatusLabel, getGameStatusTone } from '@/lib/game-status';
import { useGamesQuery } from '@/lib/queries';
import { getTeamLogoSrc } from '@/lib/team-logo';

const features: Array<{
  icon: LucideIcon;
  href: string;
  title: string;
  description: string;
}> = [
  {
    icon: CalendarDays,
    href: '/calendar',
    title: 'KBO 야구 캘린더',
    description: '오늘 경기부터 월별 일정, 내 직관 기록까지 날짜별로 봅니다.',
  },
  {
    icon: Camera,
    href: '/attendance/new',
    title: '직관 인증과 사진',
    description: '사진, 함께 간 친구, 현장 스코어를 한 경기 기록으로 남깁니다.',
  },
  {
    icon: Trophy,
    href: '/me',
    title: '팬 명예타이틀',
    description: '관람 승률과 응원 기록이 쌓이면 나만의 타이틀이 붙습니다.',
  },
];

type Props = {
  standings: TeamStandingsResponse | null;
  projection: SeasonProjectionResponse | null;
  projectionLoading: boolean;
  initialGames: Game[] | null;
  gamesRange: { from: string; to: string };
};

function formatDayLabel(value: string) {
  const [month, day] = formatKoreanMonthDay(value).split('월 ');

  return `${Number(month)}월 ${Number(day.replace('일', ''))}일 ${formatKoreanWeekday(value)}요일`;
}

/** 오늘(한국 시간) 이후로 경기가 있는 가장 가까운 날의 경기만 고른다. */
function pickNearestGameDay(games: Game[], today: string) {
  const byDay = new Map<string, Game[]>();

  for (const game of games) {
    const day = getKoreaDateString(game.gameDate);

    if (day < today) {
      continue;
    }

    byDay.set(day, [...(byDay.get(day) ?? []), game]);
  }

  const nearestDay = [...byDay.keys()].sort()[0];

  if (!nearestDay) {
    return null;
  }

  return {
    day: nearestDay,
    isToday: nearestDay === today,
    games: (byDay.get(nearestDay) ?? []).sort(
      (a, b) =>
        new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime() ||
        a.id - b.id,
    ),
  };
}

function GameRow({ game }: { game: Game }) {
  const tone = getGameStatusTone(game);
  const hasScore = game.awayScore !== null && game.homeScore !== null;
  const statusLabel =
    tone === 'cancelled'
      ? getCancellationLabel(game.cancellationReason)
      : getGameStatusLabel(tone);

  return (
    <li>
      <Link className="landing-game" href={`/games/${game.id}`}>
        <time className="landing-game__time" dateTime={game.gameDate}>
          {formatKoreanTime(game.gameDate)}
        </time>
        <span className="landing-game__matchup">
          <span className="landing-game__team">
            <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
            {game.awayTeam.shortName}
          </span>
          <span className="landing-game__score">
            {hasScore ? `${game.awayScore} : ${game.homeScore}` : 'vs'}
          </span>
          <span className="landing-game__team">
            <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
            {game.homeTeam.shortName}
          </span>
        </span>
        <span className="landing-game__meta">
          <span>{game.stadium}</span>
          <span className="landing-game__status" data-tone={tone}>
            {statusLabel}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function PublicHome({
  standings,
  projection,
  projectionLoading,
  initialGames,
  gamesRange,
}: Props) {
  const gamesQuery = useGamesQuery(gamesRange, { initialData: initialGames });
  const gameDay = useMemo(
    () => pickNearestGameDay(gamesQuery.data?.items ?? [], gamesRange.from),
    [gamesQuery.data?.items, gamesRange.from],
  );

  return (
    <main className="page-shell landing">
      <div className="landing-top">
        <section className="landing-intro">
          <div className="landing-intro__copy">
            <h1>오늘 경기를 보고, 내 야구를 남기세요.</h1>
            <p>
              KBO 일정과 순위를 확인하고, 직관과 집관의 순간을 한 시즌의
              기록으로 모으는 야구 팬 서비스입니다.
            </p>
          </div>
          <div className="landing-intro__actions">
            <Link className="landing-intro__primary" href="/register">
              내 시즌 시작하기
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="landing-intro__secondary" href="/calendar">
              전체 일정 보기
            </Link>
          </div>
        </section>

        {/* 키 비주얼이 가려지지 않도록 경기 목록은 왼쪽에만 둔다. */}
        <div className="landing-hero">
          <section
            aria-labelledby="landing-games-title"
            className="landing-games"
          >
            <header className="landing-games__head">
              <h2 id="landing-games-title">
                {gameDay
                  ? gameDay.isToday
                    ? '오늘의 경기'
                    : '다음 경기'
                  : '경기 일정'}
              </h2>
              {gameDay ? (
                <span>{formatDayLabel(gameDay.games[0].gameDate)}</span>
              ) : null}
            </header>
            {gameDay ? (
              <ul className="landing-games__list">
                {gameDay.games.map((game) => (
                  <GameRow game={game} key={game.id} />
                ))}
              </ul>
            ) : (
              <p className="landing-games__empty">
                {gamesQuery.isLoading
                  ? '경기 일정을 불러오고 있어요.'
                  : '앞으로 일주일 동안 예정된 경기가 없어요.'}
              </p>
            )}
          </section>
        </div>
      </div>

      <section
        aria-labelledby="landing-standings-title"
        className="landing-section"
      >
        <header className="landing-section__head">
          <div>
            <h2 id="landing-standings-title">KBO 팀 순위</h2>
            <p>매일 갱신되는 순위로 선두 경쟁과 중위권 흐름을 확인하세요.</p>
          </div>
          <Link href="/calendar">
            전체 일정 보기 <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </header>
        <div className="landing-section__body">
          <TeamStandingsTable standings={standings} />
        </div>
      </section>

      <section aria-label="시즌 예상 순위" className="landing-section">
        <SeasonProjectionTable
          loading={projectionLoading}
          projection={projection}
        />
      </section>

      <section
        aria-labelledby="landing-features-title"
        className="landing-features"
      >
        <h2 id="landing-features-title">경기를 보는 순간부터 기록이 됩니다</h2>
        <div className="landing-features__grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link
                className="landing-feature"
                href={feature.href}
                key={feature.title}
              >
                <span aria-hidden="true" className="landing-feature__icon">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
