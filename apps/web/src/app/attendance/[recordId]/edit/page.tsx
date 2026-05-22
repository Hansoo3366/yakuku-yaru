'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import {
  deleteAttendanceRecord,
  fetchAttendanceRecord,
  updateAttendanceRecord,
  uploadAttendancePhoto,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { getAssetUrl } from '@/lib/api';
import {
  CompanionPicker,
  toSelectedCompanions,
  type SelectedCompanion,
} from '@/components/CompanionPicker';
import { Skeleton } from '@/components/Skeleton';

type ResultValue = 'win' | 'lose' | 'draw';

function inferResult(myScore: string, opponentScore: string): ResultValue | null {
  if (myScore === '' || opponentScore === '') return null;
  const my = Number(myScore);
  const opp = Number(opponentScore);
  if (Number.isNaN(my) || Number.isNaN(opp)) return null;
  if (my > opp) return 'win';
  if (my < opp) return 'lose';
  return 'draw';
}

export default function EditAttendancePage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  const recordId = Number(params.recordId);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [memo, setMemo] = useState('');
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [watchType, setWatchType] = useState<'stadium' | 'home'>('stadium');
  const [result, setResult] = useState<ResultValue>('win');
  const [resultManuallySet, setResultManuallySet] = useState(true);
  const [companions, setCompanions] = useState<SelectedCompanion[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    fetchAttendanceRecord(recordId, token).then((response) => {
      const r = response.record;
      setRecord(r);
      setMemo(r.memo ?? '');
      setMyTeamScore(String(r.myTeamScore ?? ''));
      setOpponentScore(String(r.opponentScore ?? ''));
      setWatchType(r.watchType);
      const initialResult = (r.result as ResultValue) ?? 'win';
      setResult(initialResult);
      setCompanions(toSelectedCompanions(r.companions));
    });
  }, [recordId, router]);

  useEffect(() => {
    if (resultManuallySet) return;
    const inferred = inferResult(myTeamScore, opponentScore);
    if (inferred) setResult(inferred);
  }, [myTeamScore, opponentScore, resultManuallySet]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function pickResult(value: ResultValue) {
    setResult(value);
    setResultManuallySet(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await updateAttendanceRecord(
        recordId,
        {
          memo,
          myTeamScore: myTeamScore ? Number(myTeamScore) : null,
          opponentScore: opponentScore ? Number(opponentScore) : null,
          watchType,
          result,
          companionUserIds: companions.map((companion) => companion.id),
        },
        token,
      );

      if (photo) {
        await uploadAttendancePhoto(recordId, photo, token);
      }

      router.push('/calendar');
    } catch {
      setErrorMessage('직관 기록 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!window.confirm('이 직관 기록을 삭제할까요? 되돌릴 수 없어요.')) {
      return;
    }

    await deleteAttendanceRecord(recordId, token);
    router.push('/calendar');
  }

  if (!record) {
    return (
      <main className="app-shell">
        <Skeleton height={200} radius={10} />
        <Skeleton height={140} radius={10} />
        <Skeleton height={140} radius={10} />
      </main>
    );
  }

  const matchupTitle = `${record.game.awayTeam.shortName} vs ${record.game.homeTeam.shortName}`;
  const isOwner = record.viewerRelation === 'owner';

  return (
    <main className="app-shell">
      <Link className="back-link" href={`/games/${record.gameId}`}>
        경기 상세로
      </Link>

      <header className="app-page-header">
        <span className="eyebrow">Edit Attendance</span>
        <h1>직관 기록 수정</h1>
        <p>
          {matchupTitle} ·{' '}
          {new Date(record.game.gameDate).toLocaleDateString('ko-KR')}
        </p>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        <section className="card stack">
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <h2>관람 유형</h2>
          </div>
          <div className="choice-group" role="radiogroup" aria-label="관람 유형">
            <button
              aria-checked={watchType === 'stadium'}
              className={`choice-button ${watchType === 'stadium' ? 'is-selected' : ''}`}
              onClick={() => setWatchType('stadium')}
              role="radio"
              type="button"
            >
              야구장 직관
            </button>
            <button
              aria-checked={watchType === 'home'}
              className={`choice-button ${watchType === 'home' ? 'is-selected' : ''}`}
              onClick={() => setWatchType('home')}
              role="radio"
              type="button"
            >
              집관
            </button>
          </div>
        </section>

        <section className="card stack">
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <div>
              <h2>직관 사진</h2>
              <p>사진을 다시 선택하면 캘린더 썸네일도 업데이트돼요.</p>
            </div>
          </div>
          {photoPreviewUrl || record.photoUrl ? (
            <div className="photo-preview-wrap">
              <img
                alt="직관 사진 미리보기"
                src={photoPreviewUrl || getAssetUrl(record.photoUrl)}
              />
              <div className="photo-preview-actions">
                <label className="btn btn-ghost btn-sm" htmlFor="photo-replace">
                  변경
                  <input
                    accept="image/*"
                    id="photo-replace"
                    onChange={(event) =>
                      setPhoto(event.target.files?.[0] ?? null)
                    }
                    style={{ display: 'none' }}
                    type="file"
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="photo-dropzone" htmlFor="photo-input">
              <span aria-hidden="true" style={{ fontSize: 28 }}>
                ⊕
              </span>
              <strong>사진 가져오기</strong>
              <span>JPG, PNG 등 모바일에서는 카메라 바로 가능</span>
              <input
                accept="image/*"
                id="photo-input"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          )}
        </section>

        <section className="card stack">
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <div>
              <h2>스코어와 결과</h2>
              <p>점수를 바꾸면 결과를 자동으로 다시 계산할 수 있어요.</p>
            </div>
          </div>
          <div className="score-input-group">
            <label className="score-input-cell">
              <span>내 팀</span>
              <input
                inputMode="numeric"
                min="0"
                onChange={(event) => {
                  setMyTeamScore(event.target.value);
                  setResultManuallySet(false);
                }}
                placeholder="0"
                type="number"
                value={myTeamScore}
              />
            </label>
            <span aria-hidden="true" className="score-divider">
              :
            </span>
            <label className="score-input-cell">
              <span>상대</span>
              <input
                inputMode="numeric"
                min="0"
                onChange={(event) => {
                  setOpponentScore(event.target.value);
                  setResultManuallySet(false);
                }}
                placeholder="0"
                type="number"
                value={opponentScore}
              />
            </label>
          </div>
          <div
            className="choice-group result-toggle"
            role="radiogroup"
            aria-label="경기 결과"
          >
            {(['win', 'lose', 'draw'] as const).map((value) => (
              <button
                aria-checked={result === value}
                className={`choice-button ${result === value ? 'is-selected' : ''}`}
                data-result={value}
                key={value}
                onClick={() => pickResult(value)}
                role="radio"
                type="button"
              >
                <span className="dot" aria-hidden="true" />
                {value === 'win' ? '승리' : value === 'lose' ? '패배' : '무승부'}
              </button>
            ))}
          </div>
        </section>

        {record.companions.length ? (
          <section className="card stack-sm">
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <div>
                <h2>동행자 응답</h2>
                <p>
                  현재 응답 상태입니다.
                  {isOwner ? ' 새 동행자는 아래에서 추가하세요.' : ''}
                </p>
              </div>
            </div>
            <div className="companion-status-list">
              {record.companions.map((companion) => (
                <span
                  className="companion-status-pill"
                  data-status={companion.status}
                  key={companion.id}
                >
                  {companion.nickname}
                  <em>
                    {companion.status === 'accepted'
                      ? '수락'
                      : companion.status === 'rejected'
                        ? '거절'
                        : '대기'}
                  </em>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {isOwner ? (
          <section className="card">
            <CompanionPicker
              onChange={setCompanions}
              selectedCompanions={companions}
            />
          </section>
        ) : null}

        <section className="card stack">
          <div className="section-heading" style={{ marginBottom: 0 }}>
            <h2>메모</h2>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="memo-input">
              직관 메모
            </label>
            <textarea
              className="form-textarea"
              id="memo-input"
              onChange={(event) => setMemo(event.target.value)}
              placeholder="응원가, 분위기, 음식, 함께한 사람 등 자유롭게"
              rows={6}
              value={memo}
            />
          </div>
        </section>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="action-bar">
          <button
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? '저장 중' : '수정 완료'}
          </button>
          {isOwner ? (
            <button
              aria-label="직관 기록 삭제"
              className="icon-btn icon-btn-danger icon-btn-lg"
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
      </form>
    </main>
  );
}
