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
            const filtered = response.items.filter(
              (item) =>
                !selectedCompanions.some((selected) => selected.id === item.id),
            );
            setResults(filtered);
            setMessage(filtered.length ? '' : '검색 결과가 없어요.');
          }
        })
        .catch(() => {
          if (isMounted) {
            setResults([]);
            setMessage('회원을 검색하지 못했어요. 잠시 후 다시 시도해주세요.');
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [keyword, selectedCompanions]);

  function addCompanion(user: UserSearchResult) {
    if (selectedCompanions.some((companion) => companion.id === user.id)) {
      return;
    }

    onChange([
      ...selectedCompanions,
      { id: user.id, nickname: user.nickname, email: user.email },
    ]);
    setKeyword('');
    setResults([]);
    setMessage('');
  }

  function removeCompanion(userId: number) {
    onChange(selectedCompanions.filter((companion) => companion.id !== userId));
  }

  return (
    <div className="companion-section">
      <div className="field">
        <label className="field-label" htmlFor="companion-search-input">
          같이 간 사람
        </label>
        <span className="field-hint">
          닉네임이나 이메일로 회원을 검색하면 동행자로 태그할 수 있어요.
        </span>
        <div className="companion-search">
          <input
            id="companion-search-input"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="닉네임 또는 이메일 (2자 이상)"
            type="search"
            value={keyword}
          />
        </div>
      </div>
      {results.length ? (
        <div className="companion-result-list" role="listbox">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => addCompanion(user)}
              role="option"
              aria-selected="false"
              type="button"
            >
              <strong>{user.nickname}</strong>
              <span>{user.email}</span>
            </button>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
          {message}
        </p>
      ) : null}
      {selectedCompanions.length ? (
        <div
          aria-label="선택한 동행자"
          className="companion-chip-row"
          role="list"
        >
          {selectedCompanions.map((companion) => (
            <button
              className="companion-chip"
              key={companion.id}
              onClick={() => removeCompanion(companion.id)}
              role="listitem"
              type="button"
            >
              {companion.nickname}
              <span aria-label="제거" className="companion-chip-remove">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
