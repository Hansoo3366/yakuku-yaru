'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useMemo } from 'react';
import type { AttendanceRecord } from '@/lib/attendance-api';
import { isGameCancelled } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import type { Game } from '@/lib/baseball-api';
import {
  formatKoreanMonthDay,
  formatKoreanTime,
  formatKoreanWeekday,
  getKoreaDateString,
} from '@/lib/date-format';
import { getCancellationLabel } from '@/lib/game-cancellation';
import { getGameStatusTone } from '@/lib/game-status';
import { getStadiumShortName } from '@/lib/stadium-name';
import { getTeamLogoSrc } from '@/lib/team-logo';
import {
  SeasonTimeline,
  type SeasonTimelineSlide,
} from '@/components/SeasonTimeline';

/** 타임라인 왼쪽(지난 경기)에 두는 칸 수 */
export const PAST_TILE_LIMIT = 10;

export function formatDateParts(value: string) {
  const [month, day] = formatKoreanMonthDay(value).split('월 ');
  return {
    month,
    day: day.replace('일', ''),
    weekday: formatKoreanWeekday(value),
    time: formatKoreanTime(value),
  };
}

function formatAttendanceResultLabel(
  record: AttendanceRecord,
  favoriteTeamId: number | null | undefined,
) {
  if (isGameCancelled(record.game)) {
    return getCancellationLabel(record.game.cancellationReason);
  }

  const outcome = resolveAttendanceOutcome(record, favoriteTeamId);

  if (outcome === 'win') return '승';
  if (outcome === 'lose') return '패';
  if (outcome === 'draw') return '무';
  return '결과 미입력';
}

function getOpponent(game: Game, favoriteTeamId: number | undefined) {
  if (game.homeTeam.id === favoriteTeamId) return game.awayTeam;
  if (game.awayTeam.id === favoriteTeamId) return game.homeTeam;
  return null;
}

/** 홈·원정 글자 대신 구장 이름. 구장이 곧 홈·원정을 말해 준다. */
function TileTeam({
  game,
  favoriteTeamId,
}: {
  game: Game;
  favoriteTeamId: number | undefined;
}) {
  const opponent = getOpponent(game, favoriteTeamId);

  return (
    <span className="season-tile__team">
      <img alt="" src={getTeamLogoSrc(opponent ?? game.awayTeam)} />
      <strong>
        {opponent
          ? opponent.shortName
          : `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`}
      </strong>
      <small>{getStadiumShortName(game.stadium)}</small>
    </span>
  );
}

function TileDate({ gameDate }: { gameDate: string }) {
  const parts = formatDateParts(gameDate);

  return (
    <time dateTime={gameDate}>
      {parts.month}.{parts.day} {parts.weekday}
    </time>
  );
}

/** 기록하지 않은 응원 팀 경기 결과 칸 */
function ResultTile({
  game,
  favoriteTeamId,
}: {
  game: Game;
  favoriteTeamId: number | undefined;
}) {
  const favoriteIsHome = game.homeTeam.id === favoriteTeamId;
  const favoriteScore = favoriteIsHome ? game.homeScore : game.awayScore;
  const opponentScore = favoriteIsHome ? game.awayScore : game.homeScore;
  const outcome =
    favoriteScore === null || opponentScore === null
      ? 'unknown'
      : favoriteScore === opponentScore
        ? 'draw'
        : favoriteScore > opponentScore
          ? 'win'
          : 'lose';
  const outcomeLabel = { win: '승', lose: '패', draw: '무', unknown: '결과' }[
    outcome
  ];

  return (
    <Link
      className="season-tile season-tile--past season-tile--result"
      data-outcome={outcome}
      href={`/games/${game.id}`}
    >
      <span className="season-tile__head">
        <TileDate gameDate={game.gameDate} />
        <span className="season-tile__tag">결과</span>
      </span>
      <TileTeam favoriteTeamId={favoriteTeamId} game={game} />
      <span className="season-tile__foot">
        <span className="season-tile__score">
          {favoriteScore}
          <i aria-hidden="true">:</i>
          {opponentScore}
        </span>
        <span className="season-tile__result">{outcomeLabel}</span>
      </span>
    </Link>
  );
}

/** 내 직관·집관 기록 칸 */
function RecordTile({
  record,
  favoriteTeamId,
}: {
  record: AttendanceRecord;
  favoriteTeamId: number | undefined;
}) {
  const game = record.game as Game;
  const favoriteIsHome = game.homeTeam.id === favoriteTeamId;
  const hasScore = game.homeScore !== null && game.awayScore !== null;
  const outcome = isGameCancelled(game)
    ? 'cancelled'
    : (resolveAttendanceOutcome(record, favoriteTeamId) ?? 'unknown');

  return (
    <Link
      className="season-tile season-tile--past"
      data-outcome={outcome}
      href={`/attendance/${record.id}`}
      prefetch={false}
    >
      <span className="season-tile__head">
        <TileDate gameDate={game.gameDate} />
        <span className="season-tile__tag">
          {record.watchType === 'home' ? '집관' : '직관'}
        </span>
      </span>
      <TileTeam favoriteTeamId={favoriteTeamId} game={game} />
      <span className="season-tile__foot">
        {hasScore ? (
          <span className="season-tile__score">
            {favoriteIsHome ? game.homeScore : game.awayScore}
            <i aria-hidden="true">:</i>
            {favoriteIsHome ? game.awayScore : game.homeScore}
          </span>
        ) : (
          <span className="season-tile__note">기록</span>
        )}
        <span className="season-tile__result">
          {formatAttendanceResultLabel(record, favoriteTeamId)}
        </span>
      </span>
    </Link>
  );
}

/** 다가오는 경기 칸 */
function NextGameTile({
  game,
  favoriteTeamId,
}: {
  game: Game;
  favoriteTeamId: number | undefined;
}) {
  const tone = getGameStatusTone(game);
  const parts = formatDateParts(game.gameDate);
  const pitcher =
    game.homeTeam.id === favoriteTeamId
      ? game.probablePitchers?.home
      : game.probablePitchers?.away;

  return (
    <Link
      className="season-tile season-tile--next"
      data-outcome={tone === 'cancelled' ? 'cancelled' : undefined}
      href={`/games/${game.id}`}
    >
      <span className="season-tile__head">
        <TileDate gameDate={game.gameDate} />
        <span className="season-tile__time">{parts.time}</span>
      </span>
      <TileTeam favoriteTeamId={favoriteTeamId} game={game} />
      <span className="season-tile__foot">
        <span className="season-tile__note">
          {tone === 'cancelled'
            ? getCancellationLabel(game.cancellationReason)
            : pitcher
              ? `선발 ${pitcher.name}`
              : '선발 발표 전'}
        </span>
      </span>
    </Link>
  );
}

type Props = {
  favoriteTeamId: number | undefined;
  /** 내 최근 기록 (최신순) */
  recentRecords: AttendanceRecord[];
  /** 기록 안 한 응원 팀 경기 결과 */
  finishedTeamGames: Game[];
  upcomingGames: Game[];
};

/**
 * 타임라인: 최근 기록 → 다가오는 경기. 오늘 경기 칸을 처음 가운데에 둔다.
 * 날짜 비교는 모두 한국 시간 기준.
 */
export function HomeSeasonTimeline({
  favoriteTeamId,
  recentRecords,
  finishedTeamGames,
  upcomingGames,
}: Props) {
  const { slides, startIndex } = useMemo(() => {
    const todayKey = getKoreaDateString();
    const isToday = (gameDate: string) =>
      getKoreaDateString(gameDate) === todayKey;
    const recordGameIds = new Set(recentRecords.map((record) => record.gameId));
    // 오늘 경기를 이미 기록했으면 기록 칸 하나만 남긴다.
    const nextGames = upcomingGames.filter(
      (game) => !recordGameIds.has(game.id),
    );
    // 내 기록과 기록 안 한 팀 경기 결과를 날짜순으로 섞는다. 같은 경기는 기록 칸만 남긴다.
    const pastItems = [
      ...recentRecords.map((record) => ({
        kind: 'record' as const,
        date: record.game.gameDate,
        record,
      })),
      ...finishedTeamGames
        .filter((game) => !recordGameIds.has(game.id))
        .map((game) => ({ kind: 'result' as const, date: game.gameDate, game })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, PAST_TILE_LIMIT)
      .reverse();

    const items: SeasonTimelineSlide[] = [
      ...pastItems.map((item) =>
        item.kind === 'result'
          ? {
              key: `result-${item.game.id}`,
              isToday: isToday(item.game.gameDate),
              content: (
                <ResultTile favoriteTeamId={favoriteTeamId} game={item.game} />
              ),
            }
          : {
              key: `record-${item.record.id}`,
              isToday: isToday(item.record.game.gameDate),
              content: (
                <RecordTile
                  favoriteTeamId={favoriteTeamId}
                  record={item.record}
                />
              ),
            },
      ),
      ...nextGames.map((game) => ({
        key: `game-${game.id}`,
        isToday: isToday(game.gameDate),
        content: <NextGameTile favoriteTeamId={favoriteTeamId} game={game} />,
      })),
    ];

    if (nextGames.length === 0) {
      items.push({
        key: 'empty',
        isToday: false,
        content: (
          <div className="season-tile season-tile--empty">
            <span>가까운 일정이 없어요</span>
            <Link href="/calendar">캘린더에서 다른 달 보기</Link>
          </div>
        ),
      });
    }

    const todayIndex = items.findIndex((slide) => slide.isToday);

    return {
      slides: items,
      startIndex:
        todayIndex >= 0
          ? todayIndex
          : Math.min(pastItems.length, items.length - 1),
    };
  }, [favoriteTeamId, finishedTeamGames, recentRecords, upcomingGames]);

  return <SeasonTimeline initialIndex={startIndex} slides={slides} />;
}
