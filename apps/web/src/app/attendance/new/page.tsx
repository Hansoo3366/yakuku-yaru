'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import {
  ATTENDANCE_PHOTO_ACCEPT,
  createAttendanceRecord,
  uploadAttendancePhoto,
} from '@/lib/attendance-api';
import {
  CompanionPicker,
  type SelectedCompanion,
} from '@/components/CompanionPicker';

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

function NewAttendanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const [memo, setMemo] = useState('');
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [watchType, setWatchType] = useState<'stadium' | 'home'>('stadium');
  const [result, setResult] = useState<ResultValue>('win');
  const [resultManuallySet, setResultManuallySet] = useState(false);
  const [companions, setCompanions] = useState<SelectedCompanion[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await createAttendanceRecord(
        {
          gameId,
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
        await uploadAttendancePhoto(response.record.id, photo, token);
      }

      router.push('/calendar');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '직관 기록 저장 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <Link className="back-link" href={`/games/${gameId}`}>
        경기 상세로
      </Link>

      <header className="app-page-header">
        <span className="eyebrow">New Attendance</span>
        <h1>직관 기록 작성</h1>
        <p>오늘 경기에서 남기고 싶은 순간을 정리해보세요.</p>
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
              <p>사진을 올리면 캘린더 셀에 썸네일로 노출돼요.</p>
            </div>
          </div>
          {photoPreviewUrl ? (
            <div className="photo-preview-wrap">
              <img alt="선택한 직관 사진 미리보기" src={photoPreviewUrl} />
              <div className="photo-preview-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPhoto(null)}
                  type="button"
                >
                  사진 다시 선택
                </button>
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
                accept={ATTENDANCE_PHOTO_ACCEPT}
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
              <p>점수를 입력하면 결과는 자동으로 추정해요. 수동 선택도 가능합니다.</p>
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
          {!resultManuallySet && inferResult(myTeamScore, opponentScore) ? (
            <p className="score-input-hint">
              스코어로 자동 계산된 결과예요. 변경하면 수동 선택으로 고정됩니다.
            </p>
          ) : null}
        </section>

        <section className="card">
          <CompanionPicker
            onChange={setCompanions}
            selectedCompanions={companions}
          />
        </section>

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
            disabled={isSubmitting || !gameId}
            type="submit"
          >
            {isSubmitting ? '저장 중' : '직관 기록 저장'}
          </button>
          <Link className="btn btn-ghost btn-lg" href={`/games/${gameId}`}>
            취소
          </Link>
        </div>
      </form>
    </main>
  );
}

export default function NewAttendancePage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p className="loading-text">불러오는 중</p>
        </main>
      }
    >
      <NewAttendanceForm />
    </Suspense>
  );
}
