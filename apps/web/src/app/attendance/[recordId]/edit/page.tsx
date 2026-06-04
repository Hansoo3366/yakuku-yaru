'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { fetchMe } from '@/lib/auth-api';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { useAuthStore } from '@/lib/auth-store';
import {
  ATTENDANCE_PHOTO_ACCEPT,
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
import type { Game } from '@/lib/baseball-api';
import {
  isGameCancelled,
  isNeutralAttendance,
  normalizeFavoriteTeamId,
  requiresCheeredTeamPick,
  resolveFavoriteTeamIdInGame,
} from '@/lib/attendance-game';
import {
  resolveAttendanceScoresFromGame,
  type AttendanceResult,
} from '@/lib/attendance-score';
import { AttendanceScoreSection } from '@/components/AttendanceScoreSection';
import { CheeredTeamPicker } from '@/components/CheeredTeamPicker';
import { formatKoreanDateShort } from '@/lib/date-format';
import {
  attendanceFormSchema,
  type AttendanceFormValues,
} from '@/lib/form-schemas';

export default function EditAttendancePage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  useAuthGuard();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const recordId = Number(params.recordId);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [resultManuallySet, setResultManuallySet] = useState(true);
  const [scoreLocked, setScoreLocked] = useState(true);
  const [companions, setCompanions] = useState<SelectedCompanion[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
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
    reset,
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
    if (!hasHydrated || !token) {
      return;
    }

    Promise.all([fetchAttendanceRecord(recordId, token), fetchMe(token)]).then(
      ([response, meResponse]) => {
        const r = response.record;
        const loadedGame: Game = {
          id: r.gameId,
          gameDate: r.game.gameDate,
          stadium: r.game.stadium,
          homeTeam: r.game.homeTeam as Game['homeTeam'],
          awayTeam: r.game.awayTeam as Game['awayTeam'],
          homeScore: r.game.homeScore,
          awayScore: r.game.awayScore,
          status: r.game.status,
          cancellationReason: r.game.cancellationReason ?? null,
          probablePitchers: { home: null, away: null },
          lineupConfirmed: null,
          lineups: { home: [], away: [] },
          ticketUrl: null,
          ticketOpenAt: null,
          stadiumGuide: null,
        };

        setRecord(r);
        setGame(loadedGame);
        const favoriteTeamId = normalizeFavoriteTeamId(
          meResponse.user.favoriteTeamId,
        );
        const favoriteShortName = meResponse.user.favoriteTeamShortName ?? null;
        setFavoriteTeamId(favoriteTeamId);
        setFavoriteTeamShortName(favoriteShortName);
        setCheeredTeamId(r.cheeredTeamId ?? null);
        reset({ memo: r.memo ?? '', watchType: r.watchType });
        setCompanions(toSelectedCompanions(r.companions));

        const teamInGameId = resolveFavoriteTeamIdInGame(
          loadedGame,
          favoriteTeamId,
          favoriteShortName,
        );

        if (teamInGameId != null) {
          applyOfficialScores(loadedGame, teamInGameId);
        } else if (r.cheeredTeamId) {
          applyOfficialScores(loadedGame, r.cheeredTeamId);
        } else {
          applyOfficialScores(loadedGame, null);
        }
      },
    );
  }, [hasHydrated, recordId, reset, token]);

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

    if (needsCheeredTeam && !cheeredTeamId) {
      setErrorMessage('이 경기에서 응원한 팀을 선택해주세요.');
      return;
    }

    setErrorMessage('');

    try {
      await updateAttendanceRecord(
        recordId,
        {
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
        await uploadAttendancePhoto(recordId, photo, token);
      }

      void queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      void queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      router.push('/calendar');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '직관 기록 수정 중 오류가 발생했습니다.',
      );
    }
  }

  async function handleDelete() {
    if (!token) {
      router.replace('/');
      return;
    }

    if (!window.confirm('이 직관 기록을 삭제할까요? 되돌릴 수 없어요.')) {
      return;
    }

    await deleteAttendanceRecord(recordId, token);
    void queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    void queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
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
          {formatKoreanDateShort(record.game.gameDate)}
        </p>
      </header>

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
                    accept={ATTENDANCE_PHOTO_ACCEPT}
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
                accept={ATTENDANCE_PHOTO_ACCEPT}
                id="photo-input"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          )}
        </section>

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
              취소된 경기는 승패·스코어를 기록하지 않아요. 사진과 메모만 수정하면 됩니다.
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
