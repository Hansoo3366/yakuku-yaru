'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import {
  deleteAttendanceRecord,
  fetchAttendanceRecord,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { fetchMe } from '@/lib/auth-api';
import { getAttendanceTicketView } from '@/lib/attendance-score';
import { getAssetUrl } from '@/lib/api';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resultLabel(result: string | null) {
  switch (result) {
    case 'win':
      return 'WIN';
    case 'lose':
      return 'LOSE';
    case 'draw':
      return 'DRAW';
    default:
      return '결과 미입력';
  }
}

export default function AttendanceDetailPage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  useAuthGuard();
  const recordId = Number(params.recordId);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [viewerFavoriteTeamId, setViewerFavoriteTeamId] = useState<
    number | null
  >(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }

    Promise.all([fetchAttendanceRecord(recordId, token), fetchMe(token)])
      .then(([attendanceResponse, meResponse]) => {
        setRecord(attendanceResponse.record);
        setViewerFavoriteTeamId(meResponse.user.favoriteTeamId);
      })
      .catch(() => setErrorMessage('직관 기록을 불러오지 못했어요.'))
      .finally(() => setIsLoading(false));
  }, [recordId, router]);

  async function handleDelete() {
    if (!record) return;
    if (!confirm('이 직관 기록을 삭제할까요? 되돌릴 수 없습니다.')) return;
    const token = getAccessToken();
    if (!token) return;
    setIsDeleting(true);
    try {
      await deleteAttendanceRecord(record.id, token);
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
  const acceptedCompanions = record.companions.filter(
    (companion) => companion.status === 'accepted',
  );
  const ticket = getAttendanceTicketView(record, viewerFavoriteTeamId);
  const winLossClass = ticket.outcome ? `is-${ticket.outcome}` : 'is-blank';
  const watchLabel = record.watchType === 'home' ? '집관' : '직관';
  const hasScore = ticket.awayScore !== null && ticket.homeScore !== null;

  return (
    <main className="app-shell">
      <Link className="back-link" href="/calendar">
        캘린더로
      </Link>

      <article className={`photo-ticket ${winLossClass}`} aria-label="직관 포토 티켓">
        <div className="photo-ticket-stub">
          <span className="photo-ticket-stub-label">{watchLabel}</span>
          <span className="photo-ticket-stub-result">
            {resultLabel(ticket.outcome)}
          </span>
          <span className="photo-ticket-stub-meta">
            {new Date(record.game.gameDate).toLocaleDateString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
        </div>
        <div className="photo-ticket-perforation" aria-hidden="true" />
        <div className="photo-ticket-body">
          <div className="photo-ticket-photo">
            {record.photoUrl ? (
              <img alt="직관 사진" src={getAssetUrl(record.photoUrl)} />
            ) : (
              <div className="photo-ticket-photo-empty">
                <span aria-hidden="true">◯</span>
                <p>아직 등록된 사진이 없어요</p>
              </div>
            )}
          </div>
          <div className="photo-ticket-info">
            <span className="photo-ticket-eyebrow">KBO Attendance Ticket</span>
            <div className="photo-ticket-matchup">
              <div className="photo-ticket-team">
                <img alt="" src={getTeamLogoSrc(record.game.awayTeam)} />
                <strong>{record.game.awayTeam.shortName}</strong>
              </div>
              <div className="photo-ticket-score">
                {hasScore ? (
                  <>
                    <span className="photo-ticket-score-num">{ticket.awayScore}</span>
                    <span className="photo-ticket-score-divider">:</span>
                    <span className="photo-ticket-score-num">{ticket.homeScore}</span>
                  </>
                ) : (
                  <span className="photo-ticket-score-vs">vs</span>
                )}
              </div>
              <div className="photo-ticket-team">
                <img alt="" src={getTeamLogoSrc(record.game.homeTeam)} />
                <strong>{record.game.homeTeam.shortName}</strong>
              </div>
            </div>
            <dl className="photo-ticket-meta">
              <div>
                <dt>경기일</dt>
                <dd>{formatDate(record.game.gameDate)}</dd>
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
          </div>
        </div>
        <div className="photo-ticket-foot">
          {record.memo ? (
            <p className="photo-ticket-memo">“{record.memo}”</p>
          ) : (
            <p className="photo-ticket-memo muted">메모가 비어있어요.</p>
          )}
        </div>
      </article>

      {acceptedCompanions.length || record.companions.length ? (
        <section className="card stack-sm" aria-label="동행 정보">
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <h2>함께한 사람</h2>
          </div>
          <div className="companion-chip-row">
            {record.companions.map((companion) => (
              <span
                className="companion-chip"
                data-status={companion.status}
                key={companion.id}
              >
                {companion.nickname}
                <small>
                  {companion.status === 'accepted'
                    ? '수락'
                    : companion.status === 'rejected'
                      ? '거절'
                      : '대기'}
                </small>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card stack-sm" aria-label="기록 정보">
        <div className="section-heading" style={{ marginBottom: 0 }}>
          <div>
            <h2>기록</h2>
            <p>작성자 · {record.ownerNickname}</p>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          최근 수정 · {record.lastModifiedByNickname ?? record.ownerNickname} ·{' '}
          {new Date(record.updatedAt).toLocaleString('ko-KR')}
        </p>
      </section>

      {canEdit ? (
        <div className="icon-action-group action-icon-row" aria-label="직관 기록 관리">
          <Link
            aria-label="직관 기록 수정"
            className="icon-btn icon-btn-primary"
            href={`/attendance/${record.id}/edit`}
            title="수정"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M4 20h4.2L19.1 9.1a2.4 2.4 0 0 0 0-3.4l-.8-.8a2.4 2.4 0 0 0-3.4 0L4 15.8V20Zm2-2v-1.4L16.3 6.3a.4.4 0 0 1 .6 0l.8.8a.4.4 0 0 1 0 .6L7.4 18H6Z"
                fill="currentColor"
              />
            </svg>
          </Link>
          {isOwner ? (
            <button
              aria-label="직관 기록 삭제"
              className="icon-btn icon-btn-danger"
              disabled={isDeleting}
              onClick={handleDelete}
              title="삭제"
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm2.1 2 .45 7h4.9l.45-7h-5.8Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : null}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          동행 태그를 수락하면 기록을 함께 수정할 수 있어요.
        </p>
      )}

      {errorMessage ? (
        <p className="form-error" role="alert">{errorMessage}</p>
      ) : null}
    </main>
  );
}
