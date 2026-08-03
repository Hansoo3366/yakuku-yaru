'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { reportContent } from '@/lib/post-api';
import styles from './ReportButton.module.css';

type ReportTargetType = 'post' | 'comment' | 'user' | 'attendance';
type ReportReason =
  | 'spam'
  | 'abuse'
  | 'privacy'
  | 'copyright'
  | 'illegal'
  | 'other';

export function ReportButton({
  targetId,
  targetType,
}: {
  targetId: number;
  targetType: ReportTargetType;
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [detail, setDetail] = useState('');
  const [message, setMessage] = useState('');

  function openReport() {
    if (!token) {
      router.push('/login');
      return;
    }
    setMessage('');
    setIsOpen(true);
  }

  async function submitReport() {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      await reportContent(
        { targetType, targetId, reason, detail: detail.trim() || undefined },
        token,
      );
      setMessage('신고가 접수되었습니다. 운영자가 확인할게요.');
      setDetail('');
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : '신고를 접수하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={styles.trigger}
        onClick={openReport}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 21V4m0 1h10l-2 4 2 4H6" />
        </svg>
        <span>신고하기</span>
      </button>
      {isOpen ? (
        <div className={styles.backdrop} role="presentation">
          <section
            aria-labelledby={`report-title-${targetType}-${targetId}`}
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
          >
            <header>
              <div>
                <span>COMMUNITY SAFETY</span>
                <h2 id={`report-title-${targetType}-${targetId}`}>콘텐츠 신고</h2>
              </div>
              <button
                aria-label="신고 창 닫기"
                className={styles.close}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <label>
              <span>신고 사유</span>
              <select
                onChange={(event) => setReason(event.target.value as ReportReason)}
                value={reason}
              >
                <option value="spam">스팸·도배</option>
                <option value="abuse">욕설·괴롭힘</option>
                <option value="privacy">개인정보 노출</option>
                <option value="copyright">저작권 침해</option>
                <option value="illegal">불법 콘텐츠</option>
                <option value="other">기타</option>
              </select>
            </label>
            <label>
              <span>상세 내용 (선택)</span>
              <textarea
                maxLength={500}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="운영자가 확인할 내용을 적어주세요."
                rows={4}
                value={detail}
              />
            </label>
            {message ? <p role="status">{message}</p> : null}
            <div className={styles.actions}>
              <button
                className={styles.cancel}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                닫기
              </button>
              <button
                className={styles.submit}
                disabled={isSubmitting}
                onClick={submitReport}
                type="button"
              >
                {isSubmitting ? '접수 중' : '신고 접수'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
