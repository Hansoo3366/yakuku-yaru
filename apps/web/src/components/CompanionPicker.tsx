'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { searchUsers, type UserSearchResult } from '@/lib/user-api';
import type { AttendanceCompanion } from '@/lib/attendance-api';

export type SelectedCompanion = {
  id: number;
  nickname: string;
  email: string;
};

type CompanionPickerProps = {
  selectedCompanions: SelectedCompanion[];
  onChange: (companions: SelectedCompanion[]) => void;
};

export function toSelectedCompanions(
  companions: AttendanceCompanion[],
): SelectedCompanion[] {
  return companions.map((companion) => ({
    id: companion.userId,
    nickname: companion.nickname,
    email: companion.email,
  }));
}

export function CompanionPicker({
  selectedCompanions,
  onChange,
}: CompanionPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    const trimmedKeyword = keyword.trim();

    if (!token || trimmedKeyword.length < 2) {
      setResults([]);
      setMessage('');
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      searchUsers(trimmedKeyword, token)
        .then((response) => {
          if (isMounted) {
            setResults(response.items);
            setMessage(response.items.length ? '' : '검색 결과가 없습니다.');
          }
        })
        .catch(() => {
          if (isMounted) {
            setResults([]);
            setMessage('회원을 검색하지 못했습니다.');
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [keyword]);

  function addCompanion(user: UserSearchResult) {
    if (selectedCompanions.some((companion) => companion.id === user.id)) {
      return;
    }

    onChange([
      ...selectedCompanions,
      {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
      },
    ]);
    setKeyword('');
    setResults([]);
    setMessage('');
  }

  function removeCompanion(userId: number) {
    onChange(
      selectedCompanions.filter((companion) => companion.id !== userId),
    );
  }

  return (
    <div className="companion-picker">
      <label>
        같이 간 사람
        <input
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="닉네임 또는 이메일 2자 이상"
          type="search"
          value={keyword}
        />
      </label>
      {results.length ? (
        <div className="companion-results">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => addCompanion(user)}
              type="button"
            >
              <strong>{user.nickname}</strong>
              <span>{user.email}</span>
            </button>
          ))}
        </div>
      ) : null}
      {message ? <p>{message}</p> : null}
      {selectedCompanions.length ? (
        <div className="companion-chips" aria-label="선택한 동행자">
          {selectedCompanions.map((companion) => (
            <button
              key={companion.id}
              onClick={() => removeCompanion(companion.id)}
              type="button"
            >
              {companion.nickname}
              <span>삭제</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
