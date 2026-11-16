'use client';

/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, RotateCw, Search, X } from 'lucide-react';
import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { formatKoreanDateTimeShort } from '@/lib/date-format';
import { normalizeTeamColor } from '@/lib/team-color';
import { errorMessage } from './feedback';

export function formatDate(value: string | null | undefined) {
  return value ? formatKoreanDateTimeShort(value) : '-';
}

export function formatCount(value: number | null | undefined) {
  return value == null ? '-' : value.toLocaleString('ko-KR');
}

/* ---------- 패널 머리 ---------- */

export function PanelHeading({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-panel-head">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-panel-actions">{actions}</div> : null}
    </div>
  );
}

/* ---------- 상태 칩 ---------- */

export type ChipTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'scheduled'
  | 'cancelled';

export function Chip({
  tone = 'neutral',
  pulse = false,
  children,
}: {
  tone?: ChipTone;
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="admin-chip" data-pulse={pulse || undefined} data-tone={tone}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

/* ---------- 팀 이름 + 색 점 ---------- */

export function TeamName({
  name,
  color,
}: {
  name: string | null | undefined;
  color?: string | null;
}) {
  if (!name) {
    return <span className="admin-muted">팀 없음</span>;
  }

  const dotColor = normalizeTeamColor(color);

  return (
    <span className="admin-team">
      <i
        aria-hidden="true"
        className="admin-team-dot"
        style={dotColor ? ({ '--dot': dotColor } as CSSProperties) : undefined}
      />
      {name}
    </span>
  );
}

/* ---------- 프로필 이미지 ---------- */

export function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span aria-hidden="true" className="admin-avatar admin-avatar--empty">
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      alt=""
      className="admin-avatar"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}

/* ---------- 검색 · 필터 ---------- */

export function SearchBox({
  initialValue = '',
  placeholder,
  label,
  onSearch,
}: {
  initialValue?: string;
  placeholder: string;
  label: string;
  onSearch: (keyword: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form className="admin-search" onSubmit={handleSubmit} role="search">
      <Search aria-hidden="true" className="admin-search-icon" size={16} />
      <input
        aria-label={label}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="검색어 지우기"
          className="admin-search-clear"
          onClick={() => {
            setValue('');
            onSearch('');
          }}
          type="button"
        >
          <X aria-hidden="true" size={14} />
        </button>
      ) : null}
      <button className="btn btn-secondary btn-sm" type="submit">
        검색
      </button>
    </form>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="admin-select">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 몇 개 안 되는 상태 값은 한 번에 보이도록 버튼 묶음으로 고른다. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number; tone?: ChipTone }[];
}) {
  return (
    <div aria-label={label} className="admin-segmented" role="radiogroup">
      {options.map((option) => (
        <button
          aria-checked={value === option.value}
          className={value === option.value ? 'is-active' : ''}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          {option.label}
          {option.count != null ? (
            <span
              className="admin-segmented-count"
              data-tone={option.count > 0 ? option.tone : undefined}
            >
              {formatCount(option.count)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="admin-toolbar">{children}</div>;
}

export function ResultCount({
  total,
  unit = '건',
  fetching = false,
}: {
  total: number | null | undefined;
  unit?: string;
  fetching?: boolean;
}) {
  return (
    <p aria-live="polite" className="admin-result-count">
      {total == null ? '-' : (
        <>
          <strong>{formatCount(total)}</strong>
          {unit}
        </>
      )}
      {fetching ? <span className="admin-fetching">불러오는 중</span> : null}
    </p>
  );
}

/* ---------- 표 상태 (불러오는 중 · 오류 · 빈 목록) ---------- */

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="admin-loading" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <span className="skeleton" key={index} style={{ height: 40 }} />
      ))}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="admin-state admin-state--error" role="alert">
      <strong>목록을 불러오지 못했습니다</strong>
      <p>{errorMessage(error, '잠시 뒤 다시 시도해 주세요.')}</p>
      <button className="btn btn-secondary btn-sm" onClick={onRetry} type="button">
        <RotateCw aria-hidden="true" size={14} />
        다시 시도
      </button>
    </div>
  );
}

export function EmptyRows({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-state" role="status">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

/**
 * 불러오는 중이면 뼈대, 오류면 다시 시도, 비었으면 빈 안내를 그린다.
 * 셋 다 아니면 null 을 돌려주므로 호출하는 쪽은 `?? 목록` 으로 이어 쓴다.
 */
export function listState({
  isPending,
  isError,
  error,
  refetch,
  isEmpty,
  empty,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  isEmpty: boolean;
  empty: { title: string; description?: string; action?: ReactNode };
}) {
  if (isPending) return <LoadingRows />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isEmpty) return <EmptyRows {...empty} />;
  return null;
}

/* ---------- 페이지 넘김 ---------- */

export function Pagination({
  page,
  totalPages,
  onChange,
  label,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label={label} className="admin-pagination">
      <button
        aria-label="이전 페이지"
        className="admin-icon-btn"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </button>
      <span>
        <strong>{page}</strong> / {totalPages}
      </span>
      <button
        aria-label="다음 페이지"
        className="admin-icon-btn"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        type="button"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </button>
    </nav>
  );
}

/** 서버가 페이지를 나누지 않는 목록(최대 100~200건)을 화면에서 나눈다. */
export function paginate<T>(items: T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
  };
}

/* ---------- 상세 패널 안의 항목 ---------- */

export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="admin-detail-list">{children}</dl>;
}

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function DangerZone({ children }: { children: ReactNode }) {
  return (
    <section aria-label="되돌릴 수 없는 작업" className="admin-danger-zone">
      <h3>되돌릴 수 없는 작업</h3>
      <div>{children}</div>
    </section>
  );
}
