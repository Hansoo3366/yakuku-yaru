'use client';

import { KeyboardEvent, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
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
  const [isSearching, setIsSearching] = useState(false);
  const token = useAuthStore((state) => state.token);

  async function runSearch() {
    const trimmedKeyword = keyword.trim();

    if (!token) {
      setMessage('로그인이 필요해요.');
      setResults([]);
      return;
    }

    if (trimmedKeyword.length < 2) {
      setResults([]);
      setMessage('닉네임 또는 이메일을 2자 이상 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setMessage('');

    try {
      const response = await searchUsers(trimmedKeyword, token);
      const filtered = response.items.filter(
        (item) => !selectedCompanions.some((selected) => selected.id === item.id),
      );
      setResults(filtered);
      setMessage(filtered.length ? '' : '검색 결과가 없어요.');
    } catch {
      setResults([]);
      setMessage('회원을 검색하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void runSearch();
  }

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
          닉네임이나 이메일로 검색한 뒤 동행자로 태그할 수 있어요. Enter 또는 검색
          버튼을 눌러주세요.
        </span>
        <div className="companion-search-bar">
          <div className="companion-search-input-wrap">
            <input
              className="form-input"
              id="companion-search-input"
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="닉네임 또는 이메일 (2자 이상)"
              type="search"
              value={keyword}
            />
          </div>
          <button
            className="btn btn-secondary companion-search-button"
            disabled={isSearching}
            onClick={() => void runSearch()}
            type="button"
          >
            {isSearching ? '검색 중' : '검색'}
          </button>
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
          className="companion-chip-row companion-chip-row--picked"
          role="list"
        >
          {selectedCompanions.map((companion) => (
            <span
              className="companion-chip companion-chip--picked"
              key={companion.id}
              role="listitem"
            >
              {companion.nickname}
              <button
                aria-label={`${companion.nickname} 동행자 제거`}
                className="companion-chip-remove-btn"
                onClick={() => removeCompanion(companion.id)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
