'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchGame, type Game } from '@/lib/baseball-api';
import { getAccessToken } from '@/lib/auth';
import { fetchMe } from '@/lib/auth-api';
import {
  listAttendanceRecords,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';
import {
  getGameStatusBadgeClass,
  getGameStatusLabel,
  getGameStatusTone,
} from '@/lib/game-status';
import { hasGameStarted, isGameFinished } from '@/lib/game-outcome';
import { canWriteAttendanceRecord, isGameCancelled } from '@/lib/attendance-game';
import { getAttendanceTicketView } from '@/lib/attendance-score';
import { getAssetUrl } from '@/lib/api';
import { StatTerm } from '@/components/StatGlossary';
import { StadiumPersonalNotes } from '@/components/StadiumPersonalNotes';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function formatTicketOpenAt(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function formatStat(value: number | null, digits = 2) {
  return value === null ? '-' : value.toFixed(digits);
}

function formatRate(value: number | null) {
  if (value === null) {
    return '-';
  }

  const formatted = value.toFixed(3);

  return formatted.startsWith('0') ? formatted.slice(1) : formatted;
}

function ticketOutcomeLabel(outcome: string | null) {
  switch (outcome) {
    case 'win':
      return '승';
    case 'lose':
      return '패';
    case 'draw':
      return '무';
    default:
      return '결과 미입력';
  }
}

type Pitcher = NonNullable<Game['probablePitchers']['home']>;
type LineupPlayer = Game['lineups']['home'][number];

function StarterPitcherCard({
  label,
  pitcher,
  team,
}: {
  label: string;
  pitcher: Pitcher | null;
  team: Game['homeTeam'];
}) {
  return (
    <article className="starter-pitcher-card">
      <div className="starter-pitcher-head">
        <PlayerPhoto
          className="starter-pitcher-photo"
          placeholderClassName="starter-pitcher-photo--placeholder"
          profileImageUrl={pitcher?.profileImageUrl}
        />
        <div>
          <span>{label}</span>
          <strong>{pitcher?.name ?? '미정'}</strong>
          <p>
            {team.shortName}
            {pitcher?.backNumber ? ` · No.${pitcher.backNumber}` : ''}
            {typeof pitcher?.age === 'number' ? ` · 만 ${pitcher.age}세` : ''}
            {pitcher?.throwsHand || pitcher?.batsHand
              ? ` · ${[pitcher.throwsHand, pitcher.batsHand].filter(Boolean).join('')}`
              : ''}
          </p>
        </div>
      </div>

      {pitcher ? (
        <>
          {pitcher.stats.seasonRecord ? (
            <p className="starter-pitcher-record">
              {pitcher.stats.seasonRecord}
            </p>
          ) : null}
          <dl className="starter-pitcher-stats">
            <div>
              <dt>
                <StatTerm abbr="ERA" />
              </dt>
              <dd>{formatStat(pitcher.stats.era)}</dd>
            </div>
            <div>
              <dt>
                <StatTerm abbr="WHIP" />
              </dt>
              <dd>{formatStat(pitcher.stats.whip)}</dd>
            </div>
            <div>
              <dt>
                <StatTerm abbr="WAR" />
              </dt>
              <dd>{formatStat(pitcher.stats.war)}</dd>
            </div>
            <div>
              <dt>경기</dt>
              <dd>{pitcher.stats.games ?? '-'}</dd>
            </div>
            <div>
              <dt>선발평균</dt>
              <dd>{pitcher.stats.starterAverageInnings ?? '-'}</dd>
            </div>
            <div>
              <dt>
                <StatTerm abbr="QS" />
              </dt>
              <dd>{pitcher.stats.qualityStarts ?? '-'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="starter-pitcher-empty">선발 투수 발표 전입니다.</p>
      )}
    </article>
  );
}

function LineupPanel({
  players,
  team,
}: {
  players: LineupPlayer[];
  team: Game['homeTeam'];
}) {
  return (
    <div className="lineup-panel">
      <div className="lineup-team-title">
        <img alt="" src={getTeamLogoSrc(team)} />
        <strong>{team.shortName}</strong>
      </div>
      {players.length > 0 ? (
        <ol className="lineup-list">
          {players.map((player) => (
            <li key={player.id}>
              <span className="lineup-order">{player.battingOrder}</span>
              <PlayerPhoto
                className="lineup-player-photo"
                placeholderClassName="lineup-player-photo--placeholder"
                profileImageUrl={player.profileImageUrl}
              />
              <div className="lineup-player-main">
                <strong>
                  {player.backNumber ? `${player.backNumber} ` : ''}
                  {player.name}
                </strong>
                <span>
                  {player.fieldPosition ?? '포지션 미정'}
                  {player.age !== null ? ` · 만 ${player.age}세` : ''}
                </span>
              </div>
              <div className="lineup-stats">
                <span>타율 {formatRate(player.battingAvg)}</span>
                <span>
                  <StatTerm abbr="OPS" /> {formatRate(player.ops)}
                </span>
                <span>
                  <StatTerm abbr="WAR" /> {formatStat(player.war)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="lineup-empty">
          <strong>라인업 발표 전</strong>
          <p>동기화 후 발표된 라인업이 여기에 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}

function GameRecordPanel({
  game,
  attendanceRecord,
  canWriteAttendance,
  viewerFavoriteTeamId,
}: {
  game: Game;
  attendanceRecord: AttendanceRecord | null;
  canWriteAttendance: boolean;
  viewerFavoriteTeamId: number | null;
}) {
  if (attendanceRecord) {
    const ticket = getAttendanceTicketView(
      attendanceRecord,
      viewerFavoriteTeamId,
    );
    const cancelled = isGameCancelled(attendanceRecord.game);
    const watchLabel =
      attendanceRecord.watchType === 'home' ? '집관' : '직관';
    const outcomeLabel = cancelled
      ? '우취'
      : ticketOutcomeLabel(ticket.outcome);
    const hasScore =
      ticket.awayScore !== null && ticket.homeScore !== null;
    const scoreText = hasScore
      ? `${ticket.awayScore} : ${ticket.homeScore}`
      : null;

    return (
      <section aria-label="내 직관 기록" className="card game-record-panel">
        <div className="section-heading">
          <div>
            <h2>내 직관 기록</h2>
            <p>이 경기에 남긴 포토 티켓</p>
          </div>
        </div>
        <Link
          className="game-record-ticket-link"
          href={`/attendance/${attendanceRecord.id}`}
        >
          <div className="game-record-ticket-preview">
            <div className="game-record-ticket-photo">
              {attendanceRecord.photoUrl ? (
                <img
                  alt="직관 사진"
                  src={getAssetUrl(attendanceRecord.photoUrl)}
                />
              ) : (
                <span className="game-record-ticket-photo-empty">사진 없음</span>
              )}
            </div>
            <div className="game-record-ticket-copy">
              <span
                className={`game-record-ticket-outcome game-record-ticket-outcome--${
                  cancelled
                    ? 'cancelled'
                    : ticket.outcome ?? 'blank'
                }`}
              >
                {watchLabel} · {outcomeLabel}
              </span>
              <strong>
                {game.awayTeam.shortName} vs {game.homeTeam.shortName}
              </strong>
              <p>
                {scoreText ?? '스코어 미확정'} · {game.stadium}
              </p>
            </div>
          </div>
          <span className="btn btn-ghost">티켓 전체 보기</span>
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="직관 기록" className="card game-record-panel">
      <div className="section-heading">
        <div>
          <h2>직관 기록</h2>
          <p>경기 후 포토 티켓으로 남겨보세요</p>
        </div>
      </div>
      {canWriteAttendance ? (
        <Link
          className="btn btn-primary btn-lg game-record-cta"
          href={`/attendance/new?gameId=${game.id}`}
        >
          직관 기록 작성
        </Link>
      ) : (
        <p className="score-input-hint">
          경기 시작 후에 직관 기록을 작성할 수 있어요.
        </p>
      )}
    </section>
  );
}

export default function GameDetailPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Number(params.gameId);
  const [game, setGame] = useState<Game | null>(null);
  const [attendanceRecord, setAttendanceRecord] =
    useState<AttendanceRecord | null>(null);
  const [viewerFavoriteTeamId, setViewerFavoriteTeamId] = useState<
    number | null
  >(null);

  useEffect(() => {
    fetchGame(gameId).then((response) => setGame(response.game));

    const token = getAccessToken();
    if (!token) {
      return;
    }

    Promise.all([listAttendanceRecords({}, token), fetchMe(token)])
      .then(([attendanceResponse, meResponse]) => {
        setAttendanceRecord(
          attendanceResponse.items.find((record) => record.gameId === gameId) ??
            null,
        );
        setViewerFavoriteTeamId(meResponse.user.favoriteTeamId);
      })
      .catch(() => {
        listAttendanceRecords({}, token).then((response) => {
          setAttendanceRecord(
            response.items.find((record) => record.gameId === gameId) ?? null,
          );
        });
      });
  }, [gameId]);

  if (!game) {
    return (
      <main className="app-shell app-shell--game-detail">
        <Skeleton height={220} radius={10} />
        <Skeleton height={140} radius={10} />
        <Skeleton height={120} radius={10} />
      </main>
    );
  }

  const statusTone = getGameStatusTone(game);
  const isCancelled = game.status === 'cancelled';
  const isFinished =
    !isCancelled &&
    isGameFinished(game) &&
    game.homeScore !== null &&
    game.awayScore !== null;
  const scoreText = isFinished
    ? `${game.awayScore} : ${game.homeScore}`
    : isCancelled && game.homeScore !== null && game.awayScore !== null
      ? `${game.awayScore} : ${game.homeScore}`
      : null;
  const hasLineup =
    game.lineups.home.length > 0 || game.lineups.away.length > 0;
  const showLineupPredictedNotice =
    hasLineup &&
    game.lineupConfirmed !== true &&
    !isFinished &&
    game.status !== 'cancelled' &&
    !hasGameStarted(game);
  const canWriteAttendance = canWriteAttendanceRecord(game);
  const hasTicketExtras = Boolean(game.ticketUrl || game.ticketOpenAt);

  return (
    <main className="app-shell app-shell--game-detail">
      <Link className="back-link" href="/calendar">
        캘린더로
      </Link>

      <section
        aria-label="경기 스코어보드"
        className="match-hero match-hero--report"
      >
        <div className="match-hero-copy">
          <span className="eyebrow">Game Preview</span>
          <h1>
            {game.awayTeam.name} vs {game.homeTeam.name}
          </h1>
          <p className="match-hero-stadium">
            <span className={getGameStatusBadgeClass(statusTone)}>
              {getGameStatusLabel(statusTone)}
            </span>
            <span className="match-hero-stadium-sep" aria-hidden="true">
              ·
            </span>
            <span>
              {formatDateTime(game.gameDate)} · {game.stadium}
            </span>
          </p>
        </div>

        <div className="match-scoreboard">
          <div className="match-team">
            <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
            <strong>{game.awayTeam.shortName}</strong>
            <small>Away</small>
          </div>
          <div className="match-score">
            {isCancelled ? (
              <>
                <span className="match-score-label">CANCELLED</span>
                <span className="match-score-vs">
                  {scoreText ?? '경기 취소'}
                </span>
              </>
            ) : isFinished ? (
              <>
                <span className="match-score-label">FINAL</span>
                <span>{scoreText}</span>
              </>
            ) : (
              <>
                <span className="match-score-label">Scheduled</span>
                <span className="match-score-vs">VS</span>
              </>
            )}
          </div>
          <div className="match-team">
            <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
            <strong>{game.homeTeam.shortName}</strong>
            <small>Home</small>
          </div>
        </div>
      </section>

      <GameRecordPanel
        attendanceRecord={attendanceRecord}
        canWriteAttendance={canWriteAttendance}
        game={game}
        viewerFavoriteTeamId={viewerFavoriteTeamId}
      />

      <section aria-label="선발 투수" className="card game-report-section">
        <div className="section-heading">
          <div>
            <h2>선발 투수</h2>
            <p>시즌 기준 주요 지표</p>
          </div>
        </div>
        <div className="starter-pitcher-grid">
          <StarterPitcherCard
            label="Away 선발"
            pitcher={game.probablePitchers.away}
            team={game.awayTeam}
          />
          <StarterPitcherCard
            label="Home 선발"
            pitcher={game.probablePitchers.home}
            team={game.homeTeam}
          />
        </div>
      </section>

      <section aria-label="라인업" className="card game-report-section">
        <div className="section-heading">
          <div>
            <h2>라인업</h2>
            <p>타순·포지션·시즌 타율/OPS/WAR</p>
          </div>
        </div>
        {showLineupPredictedNotice ? (
          <p className="lineup-notice" role="status">
            <strong>공식 라인업 발표 전입니다.</strong>
            KBO 게임센터 분석 기준 예상 타순이며, 실제 출전 순서와 다를 수
            있습니다.
          </p>
        ) : null}
        <div className="lineup-grid">
          <LineupPanel players={game.lineups.away} team={game.awayTeam} />
          <LineupPanel players={game.lineups.home} team={game.homeTeam} />
        </div>
      </section>

      <section
        aria-label="예매 및 티켓 오픈"
        className="card game-report-section game-extras-panel"
      >
        <div className="section-heading">
          <div>
            <h2>예매 · 알림</h2>
            <p>티켓 예매와 오픈 일정</p>
          </div>
        </div>
        {hasTicketExtras ? (
          <div className="game-extras-stack">
            {game.ticketOpenAt ? (
              <div className="game-ticket-open-notice">
                <span className="game-ticket-open-label">티켓 오픈 예정</span>
                <strong>{formatTicketOpenAt(game.ticketOpenAt)}</strong>
                <p>오픈 시각을 확인하고 예매를 준비해 보세요.</p>
              </div>
            ) : null}
            {game.ticketUrl ? (
              <a
                className="btn btn-primary btn-lg"
                href={game.ticketUrl}
                rel="noreferrer"
                target="_blank"
              >
                예매처 열기
              </a>
            ) : null}
          </div>
        ) : (
          <p className="muted">등록된 예매·오픈 정보가 없어요.</p>
        )}
      </section>

      <StadiumPersonalNotes stadium={game.stadium} />
    </main>
  );
}
