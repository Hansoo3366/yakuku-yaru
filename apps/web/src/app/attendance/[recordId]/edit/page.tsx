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

export default function EditAttendancePage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  const recordId = Number(params.recordId);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [memo, setMemo] = useState('');
  const [myTeamScore, setMyTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [result, setResult] = useState('win');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    fetchAttendanceRecord(recordId, token).then((response) => {
      setRecord(response.record);
      setMemo(response.record.memo ?? '');
      setMyTeamScore(String(response.record.myTeamScore ?? ''));
      setOpponentScore(String(response.record.opponentScore ?? ''));
      setResult(response.record.result ?? 'win');
    });
  }, [recordId, router]);

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

    setErrorMessage('');

    try {
      await updateAttendanceRecord(
        recordId,
        {
          memo,
          myTeamScore: myTeamScore ? Number(myTeamScore) : null,
          opponentScore: opponentScore ? Number(opponentScore) : null,
          result,
        },
        token,
      );

      if (photo) {
        await uploadAttendancePhoto(recordId, photo, token);
      }

      router.push('/calendar');
    } catch {
      setErrorMessage('직관 기록 수정 중 오류가 발생했습니다.');
    }
  }

  async function handleDelete() {
    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    await deleteAttendanceRecord(recordId, token);
    router.push('/calendar');
  }

  if (!record) {
    return (
      <main className="app-shell">
        <p className="loading-text">직관 기록을 불러오는 중</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="editor-panel">
        <Link className="back-link" href={`/games/${record.gameId}`}>
          경기 상세로
        </Link>
        <h1>직관 기록 수정</h1>
        {photoPreviewUrl || record.photoUrl ? (
          <img
            alt="직관 사진 미리보기"
            className="attendance-preview"
            src={photoPreviewUrl || getAssetUrl(record.photoUrl)}
          />
        ) : null}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            직관 사진 변경
            <input
              accept="image/*"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
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
          <button type="submit">수정 완료</button>
          <button className="danger-button" type="button" onClick={handleDelete}>
            삭제
          </button>
        </form>
      </section>
    </main>
  );
}
