'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
  fetchUserStadiumNote,
  saveUserStadiumNote,
} from '@/lib/stadium-note-api';
import { StadiumSeatMapViewer } from '@/components/StadiumSeatMapViewer';
import { validateStadiumNoteClient } from '@/lib/user-input';

type Props = {
  stadium: string;
};

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function StadiumPersonalNotes({ stadium }: Props) {
  const [foodMemo, setFoodMemo] = useState('');
  const [parkingMemo, setParkingMemo] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    fetchUserStadiumNote(stadium, token)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setFoodMemo(response.note?.foodMemo ?? '');
        setParkingMemo(response.note?.parkingMemo ?? '');
        setUpdatedAt(response.note?.updatedAt ?? null);
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage('구장 메모를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stadium]);

  async function handleSave() {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    const foodError = validateStadiumNoteClient(foodMemo);
    const parkingError = validateStadiumNoteClient(parkingMemo);

    if (foodError || parkingError) {
      setErrorMessage(foodError ?? parkingError ?? '');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await saveUserStadiumNote(
        { stadium, foodMemo, parkingMemo },
        token,
      );
      setFoodMemo(response.note?.foodMemo ?? '');
      setParkingMemo(response.note?.parkingMemo ?? '');
      setUpdatedAt(response.note?.updatedAt ?? null);
      setStatusMessage(
        response.note ? '구장 메모를 저장했어요.' : '구장 메모를 비웠어요.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : '구장 메모 저장 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const token = typeof window !== 'undefined' ? getAccessToken() : null;

  if (!token) {
    return (
      <section className="card stack stadium-personal-notes">
        <div className="section-heading">
          <div>
            <h2>구장 메모</h2>
            <p>{stadium}</p>
          </div>
          <StadiumSeatMapViewer stadium={stadium} />
        </div>
        <p className="score-input-hint">
          로그인하면 맛집·주차 메모를 저장할 수 있어요. 같은 구장의 다른
          경기에서도 이어서 볼 수 있습니다. <Link href="/login">로그인</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="card stack stadium-personal-notes">
      <div className="section-heading">
        <div>
          <h2>구장 메모</h2>
          <p>
            {stadium} — 나만의 맛집·주차 정보입니다. 이 구장의 다른 경기에서도
            같은 내용이 보입니다.
          </p>
        </div>
        <StadiumSeatMapViewer stadium={stadium} />
      </div>

      {isLoading ? (
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          메모 불러오는 중
        </p>
      ) : (
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="stadium-food-memo">
              맛집 메모
            </label>
            <textarea
              className="form-textarea"
              id="stadium-food-memo"
              onChange={(event) => setFoodMemo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation();
                }
              }}
              placeholder="예) 3루 외야 쪽 포장마차, 구장 내 푸드코트 추천 메뉴..."
              rows={4}
              value={foodMemo}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="stadium-parking-memo">
              주차 정보
            </label>
            <textarea
              className="form-textarea"
              id="stadium-parking-memo"
              onChange={(event) => setParkingMemo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation();
                }
              }}
              placeholder="예) OO 주차장 2시간 무료, 막히는 시간대..."
              rows={4}
              value={parkingMemo}
            />
          </div>

          {updatedAt ? (
            <span className="field-hint">
              마지막 수정: {formatUpdatedAt(updatedAt)}
            </span>
          ) : (
            <span className="field-hint">
              아직 저장된 메모가 없어요. 입력 후 저장해주세요.
            </span>
          )}

          {statusMessage ? (
            <p className="field-hint" role="status">
              {statusMessage}
            </p>
          ) : null}
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button
            className="btn btn-primary"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? '저장 중' : '구장 메모 저장'}
          </button>
        </div>
      )}
    </section>
  );
}
