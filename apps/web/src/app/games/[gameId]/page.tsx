'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchGame, type Game } from '@/lib/baseball-api';
import { getAccessToken } from '@/lib/auth';
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
import { canWriteAttendanceRecord } from '@/lib/attendance-game';
import { StatTerm } from '@/components/StatGlossary';
import { StadiumPersonalNotes } from '@/components/StadiumPersonalNotes';

function formatDateTime(value: string) {
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

export default function GameDetailPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Number(params.gameId);
  const [game, setGame] = useState<Game | null>(null);
  const [attendanceRecord, setAttendanceRecord] =
    useState<AttendanceRecord | null>(null);
  useEffect(() => {
    fetchGame(gameId).then((response) => setGame(response.game));

    const token = getAccessToken();
    if (token) {
      listAttendanceRecords({}, token).then((response) => {
        setAttendanceRecord(
          response.items.find((record) => record.gameId === gameId) ?? null,
        );
      });
    }
  }, [gameId]);

  if (!game) {
    return (
      <main className="app-shell">
        <Skeleton height={220} radius={10} />
        <Skeleton height={140} radius={10} />
        <Skeleton height={120} radius={10} />
      </main>
    );
  }

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

  return (
    <main className="app-shell">
      <Link className="back-link" href="/calendar">
        캘린더로
      </Link>

      <section aria-label="경기 매치업" className="match-hero">
        <div>
          <span className="eyebrow">Game Detail</span>
          <h1>
            {game.awayTeam.name} vs {game.homeTeam.name}
          </h1>
          <p className="match-hero-stadium">
            {formatDateTime(game.gameDate)} · {game.stadium}
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

      <section className="card stack">
        <div className="action-bar">
          {attendanceRecord ? (
            <Link
              className="btn btn-primary btn-lg"
              href={`/attendance/${attendanceRecord.id}`}
            >
              직관 기록 보기
            </Link>
          ) : canWriteAttendance ? (
            <Link
              className="btn btn-primary btn-lg"
              href={`/attendance/new?gameId=${game.id}`}
            >
              직관 기록 작성
            </Link>
          ) : (
            <p className="score-input-hint">
              경기 시작 후에 직관 기록을 작성할 수 있어요.
            </p>
          )}
          {game.ticketUrl ? (
            <a
              className="btn btn-ghost btn-lg"
              href={game.ticketUrl}
              rel="noreferrer"
              target="_blank"
            >
              예매처 열기
            </a>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>경기 정보</h2>
        </div>
        <dl style={{ margin: 0 }}>
          <div className="info-row">
            <dt>경기 일시</dt>
            <dd>{formatDateTime(game.gameDate)}</dd>
          </div>
          <div className="info-row">
            <dt>구장</dt>
            <dd>{game.stadium}</dd>
          </div>
          <div className="info-row">
            <dt>경기 상태</dt>
            <dd>
              {(() => {
                const tone = getGameStatusTone(game);
                return (
                  <span className={getGameStatusBadgeClass(tone)}>
                    {getGameStatusLabel(tone)}
                  </span>
                );
              })()}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card">
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

      <section className="card">
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

      <StadiumPersonalNotes stadium={game.stadium} />
    </main>
  );
}
