'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { fetchMe } from '@/lib/auth-api';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { useAuthStore } from '@/lib/auth-store';
import {
  ATTENDANCE_PHOTO_ACCEPT,
  createAttendanceRecord,
  uploadAttendancePhoto,
} from '@/lib/attendance-api';
import { fetchGame, type Game } from '@/lib/baseball-api';
import {
  isGameCancelled,
  isNeutralAttendance,
  normalizeFavoriteTeamId,
  requiresCheeredTeamPick,
  canWriteAttendanceRecord,
  resolveFavoriteTeamIdInGame,
} from '@/lib/attendance-game';
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
import {
  attendanceFormSchema,
  type AttendanceFormValues,
} from '@/lib/form-schemas';

function NewAttendanceForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [resultManuallySet, setResultManuallySet] = useState(false);
  const [scoreLocked, setScoreLocked] = useState(true);
  const [companions, setCompanions] = useState<SelectedCompanion[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingGame, setIsLoadingGame] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null);
  const [favoriteTeamShortName, setFavoriteTeamShortName] = useState<string | null>(
    null,
  );
  const [cheeredTeamId, setCheeredTeamId] = useState<number | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<AttendanceFormValues>({
    defaultValues: { memo: '', watchType: 'stadium' },
    resolver: zodResolver(attendanceFormSchema),
  });
  const watchType = watch('watchType');

  const isNeutral = game
    ? isNeutralAttendance(game, favoriteTeamId, favoriteTeamShortName)
    : false;
  const needsCheeredTeam = game
    ? requiresCheeredTeamPick(game, favoriteTeamId, favoriteTeamShortName)
    : false;
  const isCancelledGame = game ? isGameCancelled(game) : false;
  const canWrite = game ? canWriteAttendanceRecord(game) : false;

  function applyOfficialScores(
    targetGame: Game,
    outcomeTeamId: number | null,
  ) {
    if (isGameCancelled(targetGame)) {
      setMyTeamScore('');
      setOpponentScore('');
      setResult(null);
      setResultManuallySet(true);
      setScoreLocked(true);
      return;
    }

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
    if (!hasHydrated) {
      return;
    }

    if (!token || !gameId) {
      setIsLoadingGame(false);
      return;
    }

    Promise.all([fetchGame(gameId), fetchMe(token)])
      .then(([gameResponse, meResponse]) => {
        setGame(gameResponse.game);
        const favoriteTeamId = normalizeFavoriteTeamId(
          meResponse.user.favoriteTeamId,
        );
        const favoriteShortName = meResponse.user.favoriteTeamShortName ?? null;
        setFavoriteTeamId(favoriteTeamId);
        setFavoriteTeamShortName(favoriteShortName);
        const teamInGameId = resolveFavoriteTeamIdInGame(
          gameResponse.game,
          favoriteTeamId,
          favoriteShortName,
        );

        if (teamInGameId != null) {
          applyOfficialScores(gameResponse.game, teamInGameId);
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
  }, [gameId, hasHydrated, token]);

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

  async function onSubmit(values: AttendanceFormValues) {
    if (!token) {
      router.replace('/');
      return;
    }

    if (!canWrite) {
      setErrorMessage('경기 시작 전에는 직관 기록을 작성할 수 없어요.');
      return;
    }

    if (needsCheeredTeam && !cheeredTeamId) {
      setErrorMessage('이 경기에서 응원한 팀을 선택해주세요.');
      return;
    }

    setErrorMessage('');

    try {
      const response = await createAttendanceRecord(
        {
          gameId,
          memo: values.memo,
          myTeamScore: null,
          opponentScore: null,
          watchType: values.watchType,
          result: null,
          isScoreModified: false,
          cheeredTeamId: needsCheeredTeam ? cheeredTeamId : null,
          companionUserIds: companions.map((companion) => companion.id),
        },
        token,
      );

      if (photo) {
        await uploadAttendancePhoto(response.record.id, photo, token);
      }

      void queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      router.push('/calendar');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '직관 기록 저장 중 오류가 발생했습니다.',
      );
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
      ) : !game ? (
        <p className="form-error">경기 정보를 불러오지 못했습니다.</p>
      ) : !canWrite ? (
        <section className="card stack">
          <p className="form-error">
            경기 시작 전에는 직관 기록을 작성할 수 없어요.
          </p>
          <Link className="btn btn-ghost btn-lg" href={`/games/${gameId}`}>
            경기 상세로
          </Link>
        </section>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <section className="card stack">
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <h2>관람 유형</h2>
            </div>
            <div className="choice-group" role="radiogroup" aria-label="관람 유형">
              <button
                aria-checked={watchType === 'stadium'}
                className={`choice-button ${watchType === 'stadium' ? 'is-selected' : ''}`}
                onClick={() =>
                  setValue('watchType', 'stadium', { shouldValidate: true })
                }
                role="radio"
                type="button"
              >
                야구장 직관
              </button>
              <button
                aria-checked={watchType === 'home'}
                className={`choice-button ${watchType === 'home' ? 'is-selected' : ''}`}
                onClick={() =>
                  setValue('watchType', 'home', { shouldValidate: true })
                }
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

          {!favoriteTeamId && !favoriteTeamShortName ? (
            <section className="card stack">
              <p className="score-input-hint">
                마이페이지에서 응원팀을 설정하면 내 팀 경기는 응원팀 선택 없이
                기록할 수 있어요.{' '}
                <Link href="/me">응원팀 설정하기</Link>
              </p>
            </section>
          ) : null}

          {game && needsCheeredTeam ? (
            <CheeredTeamPicker
              favoriteTeamId={favoriteTeamId}
              favoriteTeamShortName={favoriteTeamShortName}
              game={game}
              onChange={setCheeredTeamId}
              value={cheeredTeamId}
            />
          ) : null}

          {isCancelledGame ? (
            <section className="card stack">
              <p className="score-input-hint">
                취소된 경기는 승패·스코어를 기록하지 않아요. 사진과 메모만 남기면 됩니다.
              </p>
            </section>
          ) : (
            <AttendanceScoreSection
              myTeamScore={myTeamScore}
              opponentScore={opponentScore}
              onMyTeamScoreChange={(value) => handleScoreChange('my', value)}
              onOpponentScoreChange={(value) =>
                handleScoreChange('opponent', value)
              }
              onPickResult={pickResult}
              result={result}
              resultManuallySet={resultManuallySet}
              scoreLocked={scoreLocked}
            />
          )}

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
                placeholder="응원가, 분위기, 음식, 함께한 사람 등 자유롭게"
                rows={6}
                {...register('memo')}
              />
              {errors.memo?.message ? (
                <p className="form-error">{errors.memo.message}</p>
              ) : null}
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
