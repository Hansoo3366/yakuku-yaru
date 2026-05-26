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
};

type Props = {
  game: GameLike;
  href: string;
  favoriteTeamId: number | null | undefined;
  attendance?: AttendanceRecord | null;
  dense?: boolean;
};

function formatScoreLine(game: GameLike) {
  if (game.homeScore === null || game.awayScore === null) {
    return null;
  }

  return `${game.awayTeam.shortName} ${game.awayScore} : ${game.homeScore} ${game.homeTeam.shortName}`;
}

export function CalendarEventCard({
  game,
  href,
  favoriteTeamId,
  attendance,
  dense = false,
}: Props) {
  const outcome: GameOutcome = attendance
    ? (resolveAttendanceOutcome(attendance, favoriteTeamId) ??
      getFavoriteTeamGameOutcome(game, favoriteTeamId ?? null))
    : getFavoriteTeamGameOutcome(game, favoriteTeamId ?? null);
  const outcomeLabel = getGameOutcomeLabel(outcome);
  const matchupLabel = `${game.awayTeam.shortName} vs ${game.homeTeam.shortName}`;
  const timeLabel = formatGameTime(game.gameDate);
  const scoreLine = formatScoreLine(game);
  const isNeutral =
    attendance &&
    isNeutralAttendance(attendance.game, favoriteTeamId ?? null);
  const tagKind = attendance
    ? attendance.viewerRelation === 'companion'
      ? 'companion'
      : isNeutral
        ? 'neutral'
        : attendance.watchType
    : null;

  return (
    <Link
      aria-label={
        outcomeLabel
          ? `${timeLabel} ${matchupLabel}, ${outcomeLabel}`
          : `${timeLabel} ${matchupLabel}`
      }
      className={`calendar-event${dense ? ' calendar-event--dense' : ''}`}
      data-outcome={outcome !== 'unknown' ? outcome : undefined}
      href={href}
    >
      <span
        aria-hidden="true"
        className="calendar-event-logos"
      >
        <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
        <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
      </span>
      <span className="calendar-event-body">
        <span className="calendar-event-time">{timeLabel}</span>
        <span className="calendar-event-matchup">{matchupLabel}</span>
        {!dense && scoreLine ? (
          <span className="calendar-event-score">{scoreLine}</span>
        ) : null}
        {!dense ? (
          <span className="calendar-event-stadium">{game.stadium}</span>
        ) : null}
        {tagKind ? (
          <span className="calendar-event-tag" data-kind={tagKind}>
            {tagKind === 'home'
              ? '집관'
              : tagKind === 'companion'
                ? '동행'
                : tagKind === 'neutral'
                  ? attendance?.cheeredTeamShortName
                    ? `중립·${attendance.cheeredTeamShortName}`
                    : '중립'
                  : '직관'}
          </span>
        ) : null}
        {attendance?.photoUrl ? (
          <img
            alt="직관 사진"
            className="calendar-event-photo"
            src={getAssetUrl(attendance.photoUrl)}
          />
        ) : null}
      </span>
    </Link>
  );
}
