/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import type { AttendanceRecord } from '@/lib/attendance-api';
import { getAssetUrl } from '@/lib/api';
import { formatGameTime } from '@/lib/calendar-range';
import { isNeutralAttendance } from '@/lib/attendance-game';
import { resolveAttendanceOutcome } from '@/lib/attendance-score';
import {
  getFavoriteTeamGameOutcome,
  getGameOutcomeLabel,
  type GameOutcome,
} from '@/lib/game-outcome';
import { getCancellationMeta } from '@/lib/game-cancellation';
import { getStadiumShortName } from '@/lib/stadium-name';
import { getTeamLogoSrc } from '@/lib/team-logo';

type TeamLike = {
  id: number;
  shortName: string;
  name?: string;
  primaryColor?: string | null;
  ticketUrl?: string | null;
};

type GameLike = {
  id: number;
  gameDate: string;
  stadium: string;
  homeTeam: TeamLike;
  awayTeam: TeamLike;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  cancellationReason?: string | null;
  probablePitchers?: {
    home: { name: string; isConfirmed?: boolean } | null;
    away: { name: string; isConfirmed?: boolean } | null;
  };
};

/**
 * 같은 경기를 자리에 따라 다르게 보여 준다.
 * - line: 월간·리그 전체. 하루 다섯 경기가 한 칸에 들어가야 해서 한 줄로 줄인다.
 * - cell: 월간·응원팀. 하루 한 경기라 결과와 스코어를 크게 보여 준다.
 * - card: 주간과 모바일 목록. 폭이 넉넉해 양 팀을 좌우로 놓고 가운데에 스코어를 둔다.
 */
export type CalendarEventVariant = 'line' | 'cell' | 'card';

type Props = {
  game: GameLike;
  href: string;
  favoriteTeamId: number | null | undefined;
  attendance?: AttendanceRecord | null;
  attendanceRecords?: AttendanceRecord[];
  variant?: CalendarEventVariant;
};

function formatPitcherLine(game: GameLike) {
  const awayPitcher = game.probablePitchers?.away;
  const homePitcher = game.probablePitchers?.home;

  if (!awayPitcher && !homePitcher) {
    return null;
  }

  return `${awayPitcher?.name ?? '-'} vs ${homePitcher?.name ?? '-'}`;
}

export function CalendarEventCard({
  game,
  href,
  favoriteTeamId,
  attendance,
  attendanceRecords = attendance ? [attendance] : [],
  variant = 'card',
}: Props) {
  const ticketCount = attendanceRecords.length;
  const outcome: GameOutcome =
    game.status === 'cancelled'
      ? 'cancelled'
      : attendance
        ? (resolveAttendanceOutcome(attendance, favoriteTeamId) ??
          getFavoriteTeamGameOutcome(game, favoriteTeamId ?? null))
        : getFavoriteTeamGameOutcome(game, favoriteTeamId ?? null);
  const outcomeLabel = getGameOutcomeLabel(outcome);
  const matchupLabel = `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`;
  const timeLabel = formatGameTime(game.gameDate);
  const hasScore = game.homeScore !== null && game.awayScore !== null;
  const pitcherLine = formatPitcherLine(game);
  const cancellationMeta =
    game.status === 'cancelled'
      ? getCancellationMeta(game.cancellationReason)
      : null;
  const isNeutral =
    attendance && isNeutralAttendance(attendance.game, favoriteTeamId ?? null);
  const tagKind = attendance
    ? attendance.viewerRelation === 'companion'
      ? 'companion'
      : isNeutral
        ? 'neutral'
        : attendance.watchType
    : null;
  const tagLabel =
    tagKind === 'home'
      ? '집관'
      : tagKind === 'companion'
        ? '동행'
        : tagKind === 'neutral'
          ? attendance?.cheeredTeamShortName
            ? `중립·${attendance.cheeredTeamShortName}`
            : '중립'
          : tagKind
            ? '직관'
            : null;
  // 이긴 팀을 굵게 보여 주기 위한 표시. 응원팀이 없어도(리그 전체) 결과가 읽힌다.
  const awayWon = hasScore && game.awayScore! > game.homeScore!;
  const homeWon = hasScore && game.homeScore! > game.awayScore!;
  // 취소는 사유 아이콘(☂ ☼ ❄ …)을 글자 앞에 붙여 한눈에 보이게 한다.
  const badge = cancellationMeta
    ? `${cancellationMeta.icon} ${cancellationMeta.label}`
    : outcome === 'win' || outcome === 'lose' || outcome === 'draw'
      ? outcomeLabel
      : null;
  const common = {
    'aria-label': outcomeLabel
      ? `${timeLabel} ${matchupLabel}, ${outcomeLabel}`
      : `${timeLabel} ${matchupLabel}`,
    'data-finished': hasScore ? 'true' : undefined,
    'data-outcome': outcome !== 'unknown' ? outcome : undefined,
    href,
  };
  const score = hasScore ? (
    <span className="cal-event__score">
      {game.awayScore}
      <i aria-hidden="true">:</i>
      {game.homeScore}
    </span>
  ) : (
    <span className="cal-event__vs">{cancellationMeta ? '취소' : 'vs'}</span>
  );

  const involvesFavorite =
    favoriteTeamId != null &&
    (game.homeTeam.id === favoriteTeamId ||
      game.awayTeam.id === favoriteTeamId);

  if (variant === 'line') {
    return (
      // 리그 전체를 볼 때도 우리 팀 경기와 내가 본 경기는 한눈에 구분되게 한다.
      <Link
        {...common}
        className="cal-event cal-event--line"
        data-mine={involvesFavorite || undefined}
      >
        {/* 시간은 칸 폭을 잡아먹어 팀명이 잘리므로 한 줄 표기에는 넣지 않는다. (aria-label 과 상세에 있다) */}
        <span className="cal-event__line-teams">
          <span data-won={awayWon || undefined}>{game.awayTeam.shortName}</span>
          {score}
          <span data-won={homeWon || undefined}>{game.homeTeam.shortName}</span>
        </span>
        {cancellationMeta ? (
          // 취소 경기는 인디케이터 자리에 사유 아이콘을 둔다.
          <span
            aria-label={cancellationMeta.label}
            className="cal-event__cancel-icon"
            role="img"
            title={cancellationMeta.label}
          >
            {cancellationMeta.icon}
          </span>
        ) : tagLabel ? (
          // 한 줄 표기는 폭이 좁아 글자 대신 점으로만 내 기록을 표시한다.
          <span
            aria-label={tagLabel}
            className="cal-event__dot"
            data-kind={tagKind}
            role="img"
            title={tagLabel}
          />
        ) : null}
      </Link>
    );
  }

  const extras = (
    <>
      {tagLabel ? (
        <span className="cal-event__tag" data-kind={tagKind}>
          {tagLabel}
        </span>
      ) : null}
      {ticketCount > 1 ? (
        <span className="cal-event__tag" data-kind="count">
          티켓 {ticketCount}개
        </span>
      ) : null}
    </>
  );

  if (variant === 'cell') {
    // 응원팀 일정만 볼 때는 우리 팀 이름을 반복하지 않고 상대 팀과 구장만 보여 준다.
    // 구장 이름이 곧 홈·원정을 말해 주므로 따로 적지 않는다.
    // 스코어는 "우리 : 상대" 순서로 적어 결과 배지와 함께 바로 읽히게 한다.
    const favoriteIsHome = game.homeTeam.id === favoriteTeamId;
    const favoriteIsAway = game.awayTeam.id === favoriteTeamId;
    const opponent = favoriteIsHome
      ? game.awayTeam
      : favoriteIsAway
        ? game.homeTeam
        : null;

    return (
      <Link {...common} className="cal-event cal-event--cell">
        <span className="cal-event__head">
          <span className="cal-event__time">{timeLabel}</span>
          {badge ? <span className="cal-event__badge">{badge}</span> : null}
        </span>
        {opponent ? (
          <>
            <span className="cal-event__opponent">
              <img alt="" src={getTeamLogoSrc(opponent)} />
              <span className="cal-event__opponent-name">
                <strong>{opponent.shortName}</strong>
                <small>{getStadiumShortName(game.stadium)}</small>
              </span>
            </span>
            {hasScore ? (
              <span className="cal-event__score">
                {favoriteIsHome ? game.homeScore : game.awayScore}
                <i aria-hidden="true">:</i>
                {favoriteIsHome ? game.awayScore : game.homeScore}
              </span>
            ) : null}
          </>
        ) : (
          <span className="cal-event__opponent">
            <span>{matchupLabel}</span>
            {hasScore ? score : null}
          </span>
        )}
        {!hasScore && pitcherLine ? (
          <span className="cal-event__meta">{pitcherLine}</span>
        ) : null}
        {tagLabel || ticketCount > 1 ? (
          <span className="cal-event__tags">{extras}</span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link {...common} className="cal-event cal-event--card">
      <span className="cal-event__head">
        <span className="cal-event__time">{timeLabel}</span>
        <span className="cal-event__place">{game.stadium}</span>
        {badge ? <span className="cal-event__badge">{badge}</span> : null}
      </span>
      <span className="cal-event__card-teams">
        <span className="cal-event__team" data-won={awayWon || undefined}>
          {game.awayTeam.shortName}
          <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
        </span>
        {score}
        <span className="cal-event__team" data-won={homeWon || undefined}>
          <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
          {game.homeTeam.shortName}
        </span>
      </span>
      {pitcherLine ? (
        <span className="cal-event__meta">선발 {pitcherLine}</span>
      ) : null}
      {tagLabel || ticketCount > 1 || attendance?.photoUrl ? (
        <span className="cal-event__tags">
          {extras}
          {attendance?.photoUrl ? (
            <img
              alt="직관 사진"
              className="cal-event__photo"
              decoding="async"
              loading="lazy"
              src={getAssetUrl(attendance.photoUrl)}
            />
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
