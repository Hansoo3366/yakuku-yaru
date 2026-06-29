'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { type Game } from '@/lib/baseball-api';
import {
  respondAttendanceCompanion,
  type AttendanceRecord,
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
  onPlayerClick,
  onTeamCheerClick,
  players,
  team,
  teamCheer,
}: {
  gameStarted: boolean;
  onPlayerClick: (playerId: number) => void;
  onTeamCheerClick: (cheer: TeamCheer, imageUrl: string | null) => void;
  players: LineupPlayer[];
  team: Game['homeTeam'];
  teamCheer: TeamCheer | null;
}) {
  const hasTeamCheer = Boolean(teamCheer?.cheerId);

  return (
    <div className="lineup-panel">
      <div className="lineup-team-title">
        <img alt="" src={getTeamLogoSrc(team)} />
        <strong>{team.shortName}</strong>
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
                  placeholderClassName="lineup-player-photo--placeholder"
                  profileImageUrl={player.profileImageUrl}
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
  onCheeredTeamSelect,
  savingCheeredTeamRecordId,
  viewerFavoriteTeamId,
}: {
  game: Game;
  attendanceRecords: AttendanceRecord[];
  canWriteAttendance: boolean;
  onCheeredTeamSelect: (recordId: number, teamId: number) => void;
  savingCheeredTeamRecordId: number | null;
  viewerFavoriteTeamId: number | null;
}) {
  if (attendanceRecords.length) {
    return (
      <section
        aria-label="이 경기의 내 티켓"
        className="card game-record-panel"
      >
        <div className="section-heading">
          <div>
            <h2>이 경기의 내 티켓</h2>
            <p>
              직접 남겼거나 태깅된 포토 티켓 {attendanceRecords.length}개
            </p>
          </div>
        </div>
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
            const needsViewerCheeredTeam =
              attendanceRecord.viewerRelation === 'companion' &&
              !isTeamInGame(attendanceRecord.game, viewerFavoriteTeamId) &&
              !isGameCancelled(attendanceRecord.game);
            const selectedViewerCheeredTeamId =
              attendanceRecord.viewerCheeredTeamId ?? null;

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
                        src={getAssetUrl(attendanceRecord.photoUrl)}
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
                {needsViewerCheeredTeam ? (
                  <div className="game-record-cheer-picker">
                    <span>내 기준 응원팀</span>
                    <div>
                      {[game.awayTeam, game.homeTeam].map((team) => (
                        <button
                          className="game-record-cheer-button"
                          data-selected={selectedViewerCheeredTeamId === team.id}
                          disabled={savingCheeredTeamRecordId === attendanceRecord.id}
                          key={team.id}
                          onClick={() =>
                            onCheeredTeamSelect(attendanceRecord.id, team.id)
                          }
                          type="button"
                        >
                          <img alt="" src={getTeamLogoSrc(team)} />
                          {team.shortName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
  const [savingCheeredTeamRecordId, setSavingCheeredTeamRecordId] =
    useState<number | null>(null);
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

  async function handleCompanionCheeredTeamSelect(
    recordId: number,
    teamId: number,
  ) {
    if (!token) {
      return;
    }

    setSavingCheeredTeamRecordId(recordId);

    try {
      await respondAttendanceCompanion(recordId, 'accepted', token, {
        cheeredTeamId: teamId,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceRecords({}, token),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attendanceStats(token),
      });
    } finally {
      setSavingCheeredTeamRecordId(null);
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
        attendanceRecords={attendanceRecords}
        canWriteAttendance={canWriteAttendance}
        game={game}
        onCheeredTeamSelect={handleCompanionCheeredTeamSelect}
        savingCheeredTeamRecordId={savingCheeredTeamRecordId}
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
        <div className="lineup-grid">
          <LineupPanel
            gameStarted={hasGameStarted(game)}
            onPlayerClick={handleLineupPlayerClick}
            onTeamCheerClick={handleTeamCheerClick}
            players={game.lineups.away}
            team={game.awayTeam}
            teamCheer={teamCheersById.get(game.awayTeam.id) ?? null}
          />
          <LineupPanel
            gameStarted={hasGameStarted(game)}
            onPlayerClick={handleLineupPlayerClick}
            onTeamCheerClick={handleTeamCheerClick}
            players={game.lineups.home}
            team={game.homeTeam}
            teamCheer={teamCheersById.get(game.homeTeam.id) ?? null}
          />
        </div>
        {cheerError ? <p className="form-error">{cheerError}</p> : null}
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
