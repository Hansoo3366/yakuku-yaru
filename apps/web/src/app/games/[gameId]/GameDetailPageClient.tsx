'use client';

/* eslint-disable @next/next/no-img-element */

import './game-detail.css';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { type Game } from '@/lib/baseball-api';
import {
  type AttendanceRecord,
  updateAttendanceViewerPreference,
} from '@/lib/attendance-api';
import type { CheerDialogItem } from '@/components/PlayerCheerDialog';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';
import {
  getGameStatusBadgeClass,
  getGameStatusLabel,
  getGameStatusTone,
} from '@/lib/game-status';
import {
  hasGameStarted,
  isGameFinished,
  LINEUP_POLL_INTERVAL_MS,
  shouldPollGameLineup,
} from '@/lib/game-outcome';
import {
  canWriteAttendanceRecord,
  isGameCancelled,
  isTeamInGame,
} from '@/lib/attendance-game';
import { getAttendanceTicketView } from '@/lib/attendance-score';
import { getAssetUrl } from '@/lib/api';
import { StatTerm } from '@/components/StatGlossary';
import { StadiumPersonalNotes } from '@/components/StadiumPersonalNotes';
import { useAuthStore } from '@/lib/auth-store';
import {
  useAttendanceRecordsQuery,
  useGameQuery,
  useMeQuery,
  useTeamCheersQuery,
} from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import { formatKoreanDateTime } from '@/lib/date-format';
import { PlayerCheerDialog } from '@/components/PlayerCheerDialog';
import {
  fetchPlayerCheer,
  type PlayerCheer,
  type TeamCheer,
} from '@/lib/player-cheer-api';

function formatDateTime(value: string) {
  return formatKoreanDateTime(value);
}

function formatTicketOpenAt(value: string) {
  return formatKoreanDateTime(value);
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

function teamCheerToDialogItem(
  cheer: TeamCheer,
  imageUrl: string | null,
): CheerDialogItem {
  return {
    accentColor: cheer.teamPrimaryColor,
    cheerId: cheer.cheerId,
    imageUrl,
    imageMode: 'raw',
    lyrics: cheer.lyrics,
    meta: '팀 전체 응원가',
    subtitle: cheer.teamShortName,
    title: cheer.teamName,
    cheerTitle: cheer.cheerTitle,
    youtubeId: cheer.youtubeId,
    youtubeUrl: cheer.youtubeUrl,
  };
}

function StarterPitcherCard({
  isFavoriteTeam,
  label,
  pitcher,
  team,
}: {
  isFavoriteTeam: boolean;
  label: string;
  pitcher: Pitcher | null;
  team: Game['homeTeam'];
}) {
  return (
    <article
      className={`starter-pitcher-card${
        isFavoriteTeam ? ' is-favorite-team' : ''
      }`}
    >
      <div className="starter-pitcher-head">
        <PlayerPhoto
          className="starter-pitcher-photo"
          height={82}
          placeholderClassName="starter-pitcher-photo--placeholder"
          profileImageUrl={pitcher?.profileImageUrl}
          width={82}
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
          <p className="starter-pitcher-record">
            {pitcher.stats.seasonRecord || '-'}
          </p>
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
  gameStarted,
  isFavoriteTeam,
  isMobileActive,
  onPlayerClick,
  onTeamCheerClick,
  panelId,
  players,
  sideLabel,
  team,
  teamCheer,
}: {
  gameStarted: boolean;
  isFavoriteTeam: boolean;
  isMobileActive: boolean;
  onPlayerClick: (playerId: number) => void;
  onTeamCheerClick: (cheer: TeamCheer, imageUrl: string | null) => void;
  panelId: string;
  players: LineupPlayer[];
  sideLabel: string;
  team: Game['homeTeam'];
  teamCheer: TeamCheer | null;
}) {
  const hasTeamCheer = Boolean(teamCheer?.cheerId);

  return (
    <div
      className={`lineup-panel${isFavoriteTeam ? ' is-favorite-team' : ''}`}
      data-mobile-active={isMobileActive}
      id={panelId}
    >
      <div className="lineup-team-title">
        <img alt="" height={34} src={getTeamLogoSrc(team)} width={34} />
        <div>
          <span>{sideLabel}</span>
          <strong>{team.shortName}</strong>
        </div>
        {isFavoriteTeam ? <em>MY TEAM</em> : null}
        <button
          aria-label={`${team.shortName} 팀 응원가 보기`}
          className="lineup-team-cheer-button"
          disabled={!teamCheer || !hasTeamCheer}
          onClick={() => {
            if (!teamCheer || !hasTeamCheer) return;

            onTeamCheerClick(teamCheer, getTeamLogoSrc(team));
          }}
          title="팀 응원가"
          type="button"
        >
          ♪
        </button>
      </div>
      {players.length > 0 ? (
        <ol className="lineup-list">
          {players.map((player) => (
            <li key={player.id}>
              <div className="lineup-player-row">
                <span className="lineup-order">{player.battingOrder}</span>
                <PlayerPhoto
                  className="lineup-player-photo"
                  height={40}
                  placeholderClassName="lineup-player-photo--placeholder"
                  profileImageUrl={player.profileImageUrl}
                  width={40}
                />
                <div className="lineup-player-main">
                  <div className="lineup-player-name-row">
                    <strong>
                      {player.backNumber ? `${player.backNumber} ` : ''}
                      {player.name}
                    </strong>
                    <button
                      aria-label={`${player.name} 응원가 보기`}
                      className="lineup-cheer-button"
                      onClick={() => onPlayerClick(player.playerId)}
                      title="응원가"
                      type="button"
                    >
                      <span aria-hidden="true">♪</span>
                    </button>
                  </div>
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
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="lineup-empty">
          <strong>라인업 정보 없음</strong>
          <p>
            {gameStarted
              ? 'KBO 데이터 동기화가 끝나면 공식 라인업이 표시됩니다.'
              : 'KBO 데이터 동기화 후 라인업이 여기에 표시됩니다.'}
          </p>
        </div>
      )}
    </div>
  );
}

function GameRecordPanel({
  game,
  attendanceRecords,
  canWriteAttendance,
  isLoggedIn,
  onCheeredTeamSelect,
  savingCheeredTeam,
  viewerFavoriteTeamId,
}: {
  game: Game;
  attendanceRecords: AttendanceRecord[];
  canWriteAttendance: boolean;
  isLoggedIn: boolean;
  onCheeredTeamSelect: (teamId: number) => void;
  savingCheeredTeam: boolean;
  viewerFavoriteTeamId: number | null;
}) {
  if (attendanceRecords.length) {
    const needsViewerCheeredTeam = attendanceRecords.some(
      (record) =>
        record.viewerRelation === 'companion' &&
        !isTeamInGame(record.game, viewerFavoriteTeamId) &&
        !isGameCancelled(record.game),
    );
    const selectedViewerCheeredTeamId =
      attendanceRecords.find((record) => record.viewerCheeredTeamId)
        ?.viewerCheeredTeamId ?? null;

    return (
      <section
        aria-label="이 경기의 내 티켓"
        className="game-detail-surface game-record-panel"
        id="game-record"
      >
        <div className="section-heading">
          <div>
            <h2>내 관람 기록</h2>
            <p>
              직접 남겼거나 태깅된 포토 티켓 {attendanceRecords.length}개
            </p>
          </div>
        </div>
        {needsViewerCheeredTeam ? (
          <div className="game-record-cheer-picker">
            <span>내 기준 응원팀</span>
            <div>
              {[game.awayTeam, game.homeTeam].map((team) => (
                <button
                  className="game-record-cheer-button"
                  data-selected={selectedViewerCheeredTeamId === team.id}
                  disabled={savingCheeredTeam}
                  key={team.id}
                  onClick={() => onCheeredTeamSelect(team.id)}
                  type="button"
                >
                  <img
                    alt=""
                    height={18}
                    src={getTeamLogoSrc(team)}
                    width={18}
                  />
                  {team.shortName}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="game-record-ticket-list">
          {attendanceRecords.map((attendanceRecord) => {
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
            const relationLabel =
              attendanceRecord.viewerRelation === 'owner'
                ? '내가 작성'
                : `${attendanceRecord.ownerNickname}님 티켓`;

            return (
              <article
                className="game-record-ticket-card"
                key={attendanceRecord.id}
              >
                <div className="game-record-ticket-preview">
                  <div className="game-record-ticket-photo">
                    {attendanceRecord.photoUrl ? (
                      <img
                        alt="직관 사진"
                        height={240}
                        src={getAssetUrl(attendanceRecord.photoUrl)}
                        width={320}
                      />
                    ) : (
                      <span className="game-record-ticket-photo-empty">
                        사진 없음
                      </span>
                    )}
                  </div>
                  <div className="game-record-ticket-copy">
                    <span
                      className={`game-record-ticket-outcome game-record-ticket-outcome--${
                        cancelled ? 'cancelled' : (ticket.outcome ?? 'blank')
                      }`}
                    >
                      {watchLabel} · {outcomeLabel} · {relationLabel}
                    </span>
                    <strong>
                      {game.awayTeam.shortName} vs {game.homeTeam.shortName}
                    </strong>
                    <p>
                      {scoreText ?? '스코어 미확정'} · {game.stadium}
                    </p>
                  </div>
                </div>
                <Link
                  className="btn btn-ghost game-record-ticket-action"
                  href={`/attendance/${attendanceRecord.id}`}
                >
                  티켓 보기
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="관람 기록"
      className="game-detail-surface game-record-panel game-record-panel--empty"
      id="game-record"
    >
      <div className="section-heading">
        <div>
          <h2>내 관람 기록</h2>
          <p>직관과 집관의 순간을 포토 티켓으로 남겨보세요</p>
        </div>
      </div>
      {!isLoggedIn ? (
        <p className="score-input-hint">
          직관 기록을 남기려면{' '}
          <Link href="/login">로그인</Link>이 필요해요.
        </p>
      ) : canWriteAttendance ? (
        <Link
          className="btn btn-primary btn-lg game-record-cta"
          href={`/attendance/new?gameId=${game.id}`}
        >
          포토 티켓 남기기
        </Link>
      ) : (
        <p className="score-input-hint">
          경기 시작 후에 직관 기록을 작성할 수 있어요.
        </p>
      )}
    </section>
  );
}

function GameTicketPanel({ game }: { game: Game }) {
  const hasTicketExtras = Boolean(game.ticketUrl || game.ticketOpenAt);

  return (
    <section
      aria-label="예매 및 티켓 오픈"
      className="game-detail-surface game-extras-panel"
    >
      <div className="section-heading">
        <div>
          <h2>예매 정보</h2>
          <p>티켓 오픈 시간과 공식 예매처</p>
        </div>
      </div>
      {hasTicketExtras ? (
        <div className="game-extras-stack">
          {game.ticketOpenAt ? (
            <div className="game-ticket-open-notice">
              <span className="game-ticket-open-label">티켓 오픈</span>
              <strong>{formatTicketOpenAt(game.ticketOpenAt)}</strong>
              <p>오픈 전에 로그인과 결제 수단을 확인해 두세요.</p>
            </div>
          ) : null}
          {game.ticketUrl ? (
            <a
              className="btn btn-primary btn-lg"
              href={game.ticketUrl}
              rel="noreferrer"
              target="_blank"
            >
              공식 예매처 열기
            </a>
          ) : null}
        </div>
      ) : (
        <p className="game-detail-empty-copy">
          아직 등록된 티켓 오픈 정보가 없습니다.
        </p>
      )}
    </section>
  );
}

export function GameDetailPageClient({ gameId }: { gameId: number }) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const gameQuery = useGameQuery(gameId);
  const meQuery = useMeQuery(token);
  const attendanceRecordsQuery = useAttendanceRecordsQuery({}, token);
  const teamCheersQuery = useTeamCheersQuery();
  const [selectedPlayerCheer, setSelectedPlayerCheer] =
    useState<PlayerCheer | null>(null);
  const [selectedTeamCheer, setSelectedTeamCheer] =
    useState<CheerDialogItem | null>(null);
  const [cheerError, setCheerError] = useState('');
  const [savingCheeredTeam, setSavingCheeredTeam] = useState(false);
  const [selectedLineupTeamId, setSelectedLineupTeamId] = useState<
    number | null
  >(null);
  const game = gameQuery.data?.game ?? null;
  const attendanceRecords = useMemo(
    () =>
      attendanceRecordsQuery.data?.items.filter(
        (record) => record.gameId === gameId,
      ) ?? [],
    [attendanceRecordsQuery.data?.items, gameId],
  );
  const viewerFavoriteTeamId = meQuery.data?.user.favoriteTeamId ?? null;
  const teamCheersById = useMemo(
    () =>
      new Map(
        (teamCheersQuery.data?.items ?? []).map((cheer) => [
          cheer.teamId,
          cheer,
        ]),
      ),
    [teamCheersQuery.data?.items],
  );

  useEffect(() => {
    if (!game || !shouldPollGameLineup(game)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.game(gameId) });
    }, LINEUP_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [game, gameId, queryClient]);

  async function handleLineupPlayerClick(playerId: number) {
    setCheerError('');

    try {
      const response = await fetchPlayerCheer(playerId);
      setSelectedPlayerCheer(response.item);
    } catch {
      setCheerError('응원가 정보를 불러오지 못했습니다.');
    }
  }

  function handleTeamCheerClick(cheer: TeamCheer, imageUrl: string | null) {
    setSelectedTeamCheer(teamCheerToDialogItem(cheer, imageUrl));
  }

  async function handleCompanionCheeredTeamSelect(teamId: number) {
    if (!token) {
      return;
    }

    setSavingCheeredTeam(true);

    try {
      await updateAttendanceViewerPreference(gameId, { cheeredTeamId: teamId }, token);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceRecords({}, token),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceStats(token),
      });
    } finally {
      setSavingCheeredTeam(false);
    }
  }

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
  const hasLineup =
    game.lineups.home.length > 0 || game.lineups.away.length > 0;
  const showLineupPredictedNotice =
    hasLineup &&
    game.lineupConfirmed !== true &&
    !isFinished &&
    game.status !== 'cancelled' &&
    !hasGameStarted(game);
  const canWriteAttendance = canWriteAttendanceRecord(game);
  const hasDisplayScore =
    (isFinished || isCancelled) &&
    game.awayScore !== null &&
    game.homeScore !== null;
  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;
  const awayResult = !isFinished
    ? 'pending'
    : awayScore === homeScore
      ? 'draw'
      : awayScore > homeScore
        ? 'winner'
        : 'loser';
  const homeResult = !isFinished
    ? 'pending'
    : homeScore === awayScore
      ? 'draw'
      : homeScore > awayScore
        ? 'winner'
        : 'loser';
  const favoriteTeamIsPlaying =
    viewerFavoriteTeamId === game.awayTeam.id ||
    viewerFavoriteTeamId === game.homeTeam.id;
  const activeLineupTeamId =
    selectedLineupTeamId ??
    (favoriteTeamIsPlaying ? viewerFavoriteTeamId : game.awayTeam.id);

  return (
    <main className="app-shell app-shell--game-detail">
      <section
        aria-label="경기 스코어보드"
        className="match-hero match-hero--report"
        id="game-summary"
      >
        <div className="match-hero-topline">
          <Link className="game-detail-back" href="/calendar">
            <span aria-hidden="true">←</span> 경기 일정
          </Link>
          <span className={getGameStatusBadgeClass(statusTone)}>
            {getGameStatusLabel(statusTone)}
          </span>
        </div>
        <div className="match-hero-copy">
          <span className="eyebrow">KBO MATCH</span>
          <h1>
            {game.awayTeam.name} vs {game.homeTeam.name}
          </h1>
          <div className="match-hero-meta">
            <time dateTime={game.gameDate}>{formatDateTime(game.gameDate)}</time>
            <span>{game.stadium}</span>
          </div>
        </div>

        <div className="match-scoreboard">
          <div
            className="match-team"
            data-favorite={viewerFavoriteTeamId === game.awayTeam.id}
            data-result={awayResult}
          >
            <span className="match-team-side">원정</span>
            <img
              alt=""
              height={68}
              src={getTeamLogoSrc(game.awayTeam)}
              width={68}
            />
            <strong>{game.awayTeam.shortName}</strong>
            <small>{game.awayTeam.name}</small>
            {hasDisplayScore ? (
              <b className="match-team-score">{game.awayScore}</b>
            ) : null}
          </div>
          <div className="match-score">
            <span className="match-score-label">
              {isCancelled
                ? '경기 취소'
                : isFinished
                  ? '경기 종료'
                  : '경기 예정'}
            </span>
            <span className="match-score-vs">
              {hasDisplayScore ? ':' : 'VS'}
            </span>
          </div>
          <div
            className="match-team"
            data-favorite={viewerFavoriteTeamId === game.homeTeam.id}
            data-result={homeResult}
          >
            <span className="match-team-side">홈</span>
            <img
              alt=""
              height={68}
              src={getTeamLogoSrc(game.homeTeam)}
              width={68}
            />
            <strong>{game.homeTeam.shortName}</strong>
            <small>{game.homeTeam.name}</small>
            {hasDisplayScore ? (
              <b className="match-team-score">{game.homeScore}</b>
            ) : null}
          </div>
        </div>
      </section>

      <div className="game-detail-action-grid">
        <GameRecordPanel
          attendanceRecords={attendanceRecords}
          canWriteAttendance={canWriteAttendance}
          game={game}
          isLoggedIn={Boolean(token)}
          onCheeredTeamSelect={handleCompanionCheeredTeamSelect}
          savingCheeredTeam={savingCheeredTeam}
          viewerFavoriteTeamId={viewerFavoriteTeamId}
        />
        <GameTicketPanel game={game} />
      </div>

      <section
        aria-label="선발 투수"
        className="game-detail-surface game-report-section"
        id="starting-pitchers"
      >
        <div className="section-heading">
          <div>
            <h2>선발 투수</h2>
            <p>시즌 성적과 주요 지표를 같은 기준으로 비교합니다</p>
          </div>
        </div>
        <div className="starter-pitcher-grid">
          <StarterPitcherCard
            isFavoriteTeam={viewerFavoriteTeamId === game.awayTeam.id}
            label="원정 선발"
            pitcher={game.probablePitchers.away}
            team={game.awayTeam}
          />
          <span aria-hidden="true" className="starter-matchup-divider">
            VS
          </span>
          <StarterPitcherCard
            isFavoriteTeam={viewerFavoriteTeamId === game.homeTeam.id}
            label="홈 선발"
            pitcher={game.probablePitchers.home}
            team={game.homeTeam}
          />
        </div>
      </section>

      <section
        aria-label="라인업"
        className="game-detail-surface game-report-section"
        id="lineups"
      >
        <div className="section-heading">
          <div>
            <h2>라인업</h2>
            <p>타순·포지션과 시즌 타율·OPS·WAR</p>
          </div>
        </div>
        {showLineupPredictedNotice ? (
          <p className="lineup-notice" role="status">
            <strong>예상 라인업입니다.</strong>
            KBO 게임센터의 최근 라인업 기준이며, 공식 타순 발표 후 자동으로
            갱신됩니다.
          </p>
        ) : null}
        {!showLineupPredictedNotice &&
        hasLineup &&
        game.lineupConfirmed === true ? (
          <p className="lineup-notice lineup-notice--confirmed" role="status">
            <strong>공식 라인업입니다.</strong>
          </p>
        ) : null}
        <div aria-label="모바일 라인업 선택" className="lineup-mobile-switch">
          {[game.awayTeam, game.homeTeam].map((team) => {
            const selected = activeLineupTeamId === team.id;

            return (
              <button
                aria-controls={`lineup-team-${team.id}`}
                aria-pressed={selected}
                className={selected ? 'is-selected' : ''}
                key={team.id}
                onClick={() => setSelectedLineupTeamId(team.id)}
                type="button"
              >
                <img
                  alt=""
                  height={24}
                  src={getTeamLogoSrc(team)}
                  width={24}
                />
                {team.shortName}
              </button>
            );
          })}
        </div>
        <div className="lineup-grid">
          <LineupPanel
            gameStarted={hasGameStarted(game)}
            isFavoriteTeam={viewerFavoriteTeamId === game.awayTeam.id}
            isMobileActive={activeLineupTeamId === game.awayTeam.id}
            onPlayerClick={handleLineupPlayerClick}
            onTeamCheerClick={handleTeamCheerClick}
            panelId={`lineup-team-${game.awayTeam.id}`}
            players={game.lineups.away}
            sideLabel="원정 라인업"
            team={game.awayTeam}
            teamCheer={teamCheersById.get(game.awayTeam.id) ?? null}
          />
          <LineupPanel
            gameStarted={hasGameStarted(game)}
            isFavoriteTeam={viewerFavoriteTeamId === game.homeTeam.id}
            isMobileActive={activeLineupTeamId === game.homeTeam.id}
            onPlayerClick={handleLineupPlayerClick}
            onTeamCheerClick={handleTeamCheerClick}
            panelId={`lineup-team-${game.homeTeam.id}`}
            players={game.lineups.home}
            sideLabel="홈 라인업"
            team={game.homeTeam}
            teamCheer={teamCheersById.get(game.homeTeam.id) ?? null}
          />
        </div>
        {cheerError ? (
          <p className="form-error" role="alert">
            {cheerError}
          </p>
        ) : null}
      </section>

      <div className="game-detail-stadium" id="stadium-notes">
        <StadiumPersonalNotes stadium={game.stadium} />
      </div>
      <PlayerCheerDialog
        onClose={() => setSelectedPlayerCheer(null)}
        player={selectedPlayerCheer}
      />
      <PlayerCheerDialog
        cheer={selectedTeamCheer}
        onClose={() => setSelectedTeamCheer(null)}
      />
    </main>
  );
}
