'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import {
  createAttendanceRecord,
  uploadAttendancePhoto,
} from '@/lib/attendance-api';

function NewAttendanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = Number(searchParams.get('gameId'));
  const [memo, setMemo] = useState('');
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [watchType, setWatchType] = useState<'stadium' | 'home'>('stadium');
  const [result, setResult] = useState('win');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

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
        },
        token,
      );

      if (photo) {
        await uploadAttendancePhoto(response.record.id, photo, token);
      }

      router.push('/calendar');
    } catch {
      setErrorMessage('직관 기록 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="editor-panel">
        <Link className="back-link" href={`/games/${gameId}`}>
          경기 상세로
        </Link>
        <h1>직관 기록 작성</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            관람 유형
            <select
              onChange={(event) =>
                setWatchType(event.target.value === 'home' ? 'home' : 'stadium')
              }
              value={watchType}
            >
              <option value="stadium">야구장 직관</option>
              <option value="home">집관</option>
            </select>
          </label>
          <label>
            직관 사진
            <input
              accept="image/*"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          {photoPreviewUrl ? (
            <img
              alt="선택한 직관 사진 미리보기"
              className="attendance-preview"
              src={photoPreviewUrl}
            />
          ) : null}
          <label>
            내 팀 점수
            <input
              min="0"
              onChange={(event) => setMyTeamScore(event.target.value)}
              type="number"
              value={myTeamScore}
            />
          </label>
          <label>
            상대 점수
            <input
              min="0"
              onChange={(event) => setOpponentScore(event.target.value)}
              type="number"
              value={opponentScore}
            />
          </label>
          <label>
            결과
            <select
              onChange={(event) => setResult(event.target.value)}
              value={result}
            >
              <option value="win">승리</option>
              <option value="lose">패배</option>
              <option value="draw">무승부</option>
            </select>
          </label>
          <label>
            메모
            <textarea
              onChange={(event) => setMemo(event.target.value)}
              rows={8}
              value={memo}
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          <button disabled={isSubmitting || !gameId} type="submit">
            {isSubmitting ? '저장 중' : '저장'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function NewAttendancePage() {
  return (
    <Suspense fallback={<main className="app-shell">불러오는 중</main>}>
      <NewAttendanceForm />
    </Suspense>
  );
}
