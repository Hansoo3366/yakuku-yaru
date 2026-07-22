'use client';

/* eslint-disable @next/next/no-img-element */

import './attendance-ticket.css';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { useAuthStore } from '@/lib/auth-store';
import {
  deleteAttendanceRecord,
  fetchAttendanceRecord,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { fetchMe } from '@/lib/auth-api';
import { isGameCancelled } from '@/lib/attendance-game';
import { getAttendanceTicketView } from '@/lib/attendance-score';
import { getAssetUrl } from '@/lib/api';
import { getCancellationTicketStubLines } from '@/lib/game-cancellation';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';
import {
  formatKoreanDate,
  formatKoreanDateTimeShort,
  formatKoreanMonthDay,
  formatKoreanTime,
} from '@/lib/date-format';

function formatDate(value: string) {
  return formatKoreanDate(value);
}

function formatTime(value: string) {
  return formatKoreanTime(value);
}

function ticketStubOutcomeLabel(outcome: string | null) {
  switch (outcome) {
    case 'win':
      return '승리';
    case 'lose':
      return '패배';
    case 'draw':
      return '무승부';
    default:
      return '결과 없음';
  }
}

export default function AttendanceDetailPage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const recordId = Number(params.recordId);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [viewerFavoriteTeamId, setViewerFavoriteTeamId] = useState<
    number | null
  >(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !token) {
      return;
    }

    Promise.all([fetchAttendanceRecord(recordId, token), fetchMe(token)])
      .then(([attendanceResponse, meResponse]) => {
        setRecord(attendanceResponse.record);
        setViewerFavoriteTeamId(meResponse.user.favoriteTeamId);
      })
      .catch(() => setErrorMessage('직관 기록을 불러오지 못했어요.'))
      .finally(() => setIsLoading(false));
  }, [hasHydrated, recordId, token]);

  async function handleDelete() {
    if (!record) return;
    if (!token) return;
    setIsDeleting(true);
    try {
      await deleteAttendanceRecord(record.id, token);
      void queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      router.push('/calendar');
    } catch {
      setErrorMessage('삭제에 실패했어요. 잠시 후 다시 시도해주세요.');
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <Skeleton height={420} radius={14} />
      </main>
    );
  }

  if (!record) {
    return (
      <main className="app-shell">
        <p className="muted">{errorMessage || '기록을 찾지 못했어요.'}</p>
        <Link className="back-link" href="/calendar">
          캘린더로 돌아가기
        </Link>
      </main>
    );
  }

  const isOwner = record.viewerRelation === 'owner';
  const canEdit = record.canEdit;
  const ticket = getAttendanceTicketView(record, viewerFavoriteTeamId);
  const isCancelled = isGameCancelled(record.game);
  const winLossClass = isCancelled
    ? 'is-cancelled'
    : ticket.outcome
      ? `is-${ticket.outcome}`
      : 'is-blank';
  const watchLabel = record.watchType === 'home' ? '집관' : '직관';
  const hasScore = ticket.awayScore !== null && ticket.homeScore !== null;
  const cancelStub = isCancelled
    ? getCancellationTicketStubLines(record.game.cancellationReason)
    : null;
  const statusLabel = cancelStub
    ? [cancelStub.reason, cancelStub.status].filter(Boolean).join(' · ')
    : ticketStubOutcomeLabel(ticket.outcome);
  const ticketSerial = String(record.id).padStart(5, '0');
  const gameYear = new Date(record.game.gameDate).getFullYear();

  return (
    <main className="app-shell attendance-ticket-page">
      <div className="attendance-ticket-page__topbar">
        <Link className="attendance-ticket-back" href="/calendar">
          <span aria-hidden="true">←</span>
          캘린더
        </Link>
        {canEdit ? (
          <div className="attendance-ticket-actions" aria-label="직관 기록 관리">
            <Link
              className="attendance-ticket-action attendance-ticket-action--primary"
              href={`/attendance/${record.id}/edit`}
            >
              기록 수정
            </Link>
            {isOwner ? (
              <button
                aria-expanded={isDeleteConfirming}
                className="attendance-ticket-action attendance-ticket-action--danger"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirming(true)}
                type="button"
              >
                삭제
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isDeleteConfirming ? (
        <section
          aria-label="직관 기록 삭제 확인"
          className="attendance-ticket-delete-confirm"
          role="status"
        >
          <div>
            <strong>이 기록을 삭제할까요?</strong>
            <p>삭제한 사진과 메모는 복구할 수 없습니다.</p>
          </div>
          <div className="attendance-ticket-delete-confirm__actions">
            <button
              className="attendance-ticket-action"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirming(false)}
              type="button"
            >
              취소
            </button>
            <button
              className="attendance-ticket-action attendance-ticket-action--danger-solid"
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
            >
              {isDeleting ? '삭제 중' : '삭제하기'}
            </button>
          </div>
        </section>
      ) : null}

      <header className="attendance-ticket-heading">
        <span>MY BALLPARK · {watchLabel}</span>
        <h1>나의 {watchLabel} 티켓</h1>
        <p>
          {formatKoreanMonthDay(record.game.gameDate)} · {record.game.stadium}
        </p>
      </header>

      <article
        className={`attendance-ticket-card ${winLossClass}`}
        aria-label={`${record.game.awayTeam.shortName} 대 ${record.game.homeTeam.shortName} ${watchLabel} 티켓`}
      >
        <header className="attendance-ticket-card__top">
          <div className="attendance-ticket-card__identity">
            <span>{gameYear} SEASON</span>
            <strong>KBO {watchLabel} TICKET</strong>
          </div>
          <div className="attendance-ticket-card__status">
            <strong>{statusLabel}</strong>
            <span>NO. {ticketSerial}</span>
          </div>
        </header>

        <div className="attendance-ticket-card__body">
          <figure className="attendance-ticket-photo">
            {record.photoUrl ? (
              <img
                alt={`${formatKoreanMonthDay(record.game.gameDate)} ${watchLabel} 사진`}
                src={getAssetUrl(record.photoUrl)}
              />
            ) : (
              <div className="attendance-ticket-photo__empty">
                <span aria-hidden="true">PHOTO</span>
                <strong>이 경기의 사진이 없습니다</strong>
                <p>응원석과 야구장의 순간을 티켓에 남겨보세요.</p>
                {canEdit ? (
                  <Link href={`/attendance/${record.id}/edit`}>
                    사진 추가하기
                  </Link>
                ) : null}
              </div>
            )}
          </figure>

          <div className="attendance-ticket-game">
            <div className="attendance-ticket-matchup">
              <div className="attendance-ticket-team">
                <img
                  alt={`${record.game.awayTeam.name} 로고`}
                  src={getTeamLogoSrc(record.game.awayTeam)}
                />
                <strong>{record.game.awayTeam.shortName}</strong>
                <span>원정</span>
              </div>
              <div
                className="attendance-ticket-score"
                aria-label={
                  hasScore
                    ? `${record.game.awayTeam.shortName} ${ticket.awayScore}, ${record.game.homeTeam.shortName} ${ticket.homeScore}`
                    : '경기 스코어 없음'
                }
              >
                {hasScore ? (
                  <>
                    <strong>{ticket.awayScore}</strong>
                    <span>:</span>
                    <strong>{ticket.homeScore}</strong>
                  </>
                ) : (
                  <span className="attendance-ticket-score__vs">VS</span>
                )}
              </div>
              <div className="attendance-ticket-team">
                <img
                  alt={`${record.game.homeTeam.name} 로고`}
                  src={getTeamLogoSrc(record.game.homeTeam)}
                />
                <strong>{record.game.homeTeam.shortName}</strong>
                <span>홈</span>
              </div>
            </div>

            <dl className="attendance-ticket-meta">
              <div>
                <dt>경기일</dt>
                <dd>
                  <time dateTime={record.game.gameDate}>
                    {formatDate(record.game.gameDate)}
                  </time>
                </dd>
              </div>
              <div>
                <dt>플레이볼</dt>
                <dd>{formatTime(record.game.gameDate)}</dd>
              </div>
              <div>
                <dt>구장</dt>
                <dd>{record.game.stadium}</dd>
              </div>
              <div>
                <dt>관람</dt>
                <dd>{watchLabel}</dd>
              </div>
            </dl>

            <Link
              className="attendance-ticket-game-link"
              href={`/games/${record.gameId}`}
            >
              경기 상세 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <footer className="attendance-ticket-memory">
          <span>오늘의 한 줄</span>
          {record.memo ? (
            <p>{record.memo}</p>
          ) : (
            <p className="attendance-ticket-memory__empty">
              아직 남긴 메모가 없습니다.
            </p>
          )}
        </footer>
      </article>

      <section className="attendance-ticket-ledger" aria-label="기록 정보">
        <div className="attendance-ticket-ledger__heading">
          <h2>티켓 정보</h2>
          <span>기록의 작성·수정 내역</span>
        </div>
        <div className="attendance-ticket-ledger__content">
          <dl className="attendance-ticket-provenance">
            <div>
              <dt>기록한 사람</dt>
              <dd>{record.ownerNickname}</dd>
            </div>
            <div>
              <dt>최근 수정</dt>
              <dd>
                {record.lastModifiedByNickname ?? record.ownerNickname} ·{' '}
                {formatKoreanDateTimeShort(record.updatedAt)}
              </dd>
            </div>
          </dl>

          {record.companions.length ? (
            <div className="attendance-ticket-companions">
              <h3>함께 본 사람</h3>
              <div className="attendance-ticket-companions__list">
                {record.companions.map((companion) => (
                  <Link
                    className="attendance-ticket-person"
                    data-status={companion.status}
                    href={`/fans/${companion.userId}`}
                    key={companion.id}
                  >
                    <strong>{companion.nickname}</strong>
                    <small>
                      {companion.status === 'accepted'
                        ? '수락'
                        : companion.status === 'rejected'
                          ? '거절'
                          : '대기'}
                    </small>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {!canEdit ? (
          <p className="attendance-ticket-permission-note">
            동행 태그를 수락하면 이 기록을 함께 수정할 수 있습니다.
          </p>
        ) : null}
      </section>

      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </main>
  );
}
