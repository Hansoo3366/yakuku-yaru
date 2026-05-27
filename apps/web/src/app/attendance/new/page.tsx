'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { fetchMe } from '@/lib/auth-api';
import { useAuthGuard } from '@/lib/use-auth-guard';
import {
  ATTENDANCE_PHOTO_ACCEPT,
  createAttendanceRecord,
  uploadAttendancePhoto,
} from '@/lib/attendance-api';
import { fetchGame, type Game } from '@/lib/baseball-api';
import { isNeutralAttendance } from '@/lib/attendance-game';
import {
  resolveAttendanceScoresFromGame,
  type AttendanceResult,
} from '@/lib/attendance-score';
import {
  CompanionPicker,
  type SelectedCompanion,
} from '@/components/CompanionPicker';
import { AttendanceScoreSection } from '@/components/AttendanceScoreSection';
import { CheeredTeamPicker } from '@/components/CheeredTeamPicker';

function NewAttendanceForm() {
  const router = useRouter();
  useAuthGuard();
  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const [memo, setMemo] = useState('');
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [watchType, setWatchType] = useState<'stadium' | 'home'>('stadium');
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [resultManuallySet, setResultManuallySet] = useState(false);
  const [scoreLocked, setScoreLocked] = useState(true);
  const [companions, setCompanions] = useState<SelectedCompanion[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
  const [cheeredTeamId, setCheeredTeamId] = useState<number | null>(null);

  const isNeutral = game ? isNeutralAttendance(game, favoriteTeamId) : false;

  function applyOfficialScores(
    targetGame: Game,
    outcomeTeamId: number | null,
  ) {
    const official = resolveAttendanceScoresFromGame(targetGame, outcomeTeamId);

    if (official) {
      setMyTeamScore(String(official.myTeamScore));
      setOpponentScore(String(official.opponentScore));
      setResult(official.result);
      setResultManuallySet(true);
      setScoreLocked(true);
      return;
    }

    setMyTeamScore('');
    setOpponentScore('');
    setResult(null);
    setResultManuallySet(true);
    setScoreLocked(true);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !gameId) {
      setIsLoadingGame(false);
      return;
    }

    Promise.all([fetchGame(gameId), fetchMe(token)])
      .then(([gameResponse, meResponse]) => {
        setGame(gameResponse.game);
        setFavoriteTeamId(meResponse.user.favoriteTeamId);
        const neutral = isNeutralAttendance(
          gameResponse.game,
          meResponse.user.favoriteTeamId,
        );

        if (!neutral) {
          applyOfficialScores(gameResponse.game, meResponse.user.favoriteTeamId);
        } else {
          applyOfficialScores(gameResponse.game, null);
        }
      })
      .catch(() => {
        setErrorMessage('경기 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        setIsLoadingGame(false);
      });
  }, [gameId]);

  useEffect(() => {
    if (!game || !isNeutral || !cheeredTeamId) {
      return;
    }

    applyOfficialScores(game, cheeredTeamId);
  }, [game, isNeutral, cheeredTeamId]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function pickResult(value: AttendanceResult) {
    if (scoreLocked) return;
    setResult(value);
    setResultManuallySet(true);
  }

  function handleScoreChange(side: 'my' | 'opponent', value: string) {
    if (scoreLocked) return;

    if (side === 'my') {
      setMyTeamScore(value);
    } else {
      setOpponentScore(value);
    }
    setResultManuallySet(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const token = getAccessToken();

    if (!token) {
      router.replace('/');
      return;
    }

    if (isNeutral && !cheeredTeamId) {
      setErrorMessage('이 경기에서 응원한 팀을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await createAttendanceRecord(
        {
          gameId,
          memo,
          myTeamScore: null,
          opponentScore: null,
          watchType,
          result: null,
          isScoreModified: false,
          cheeredTeamId: isNeutral ? cheeredTeamId : null,
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

      {isLoadingGame ? (
        <p className="loading-text">경기 정보 불러오는 중</p>
      ) : (
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

          {game && isNeutral ? (
            <CheeredTeamPicker
              game={game}
              onChange={setCheeredTeamId}
              value={cheeredTeamId}
            />
          ) : null}

          <AttendanceScoreSection
            myTeamScore={myTeamScore}
            opponentScore={opponentScore}
            onMyTeamScoreChange={(value) => handleScoreChange('my', value)}
            onOpponentScoreChange={(value) => handleScoreChange('opponent', value)}
            onPickResult={pickResult}
            result={result}
            resultManuallySet={resultManuallySet}
            scoreLocked={scoreLocked}
          />

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
      )}
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
