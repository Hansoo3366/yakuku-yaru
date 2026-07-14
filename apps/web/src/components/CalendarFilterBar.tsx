'use client';

import { useEffect, useState } from 'react';
import {
  CalendarOutcomeLegend,
  type CalendarOutcomeCounts,
  type CalendarOutcomeFilter,
} from '@/components/CalendarOutcomeLegend';
import { getMonthStart, getWeekStart } from '@/lib/calendar-range';

type ViewMode = 'month' | 'week';
type ScheduleFilter = 'favorite' | 'favorite-home' | 'all';
type WatchTypeFilter = 'all' | 'stadium' | 'home';

const SCHEDULE_LABELS: Record<ScheduleFilter, string> = {
  all: '리그 전체',
  favorite: '응원팀',
  'favorite-home': '홈구장',
};

const WATCH_LABELS: Record<WatchTypeFilter, string> = {
  all: '전체',
  stadium: '직관',
  home: '집관',
};

const SCHEDULE_DESCRIPTIONS: Record<ScheduleFilter, string> = {
  all: 'KBO 모든 구단',
  favorite: '홈·원정 모두',
  'favorite-home': '홈 경기만',
};

type Props = {
  layout: 'mobile' | 'rail';
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  scheduleFilter: ScheduleFilter;
  onScheduleFilterChange: (filter: ScheduleFilter) => void;
  watchTypeFilter: WatchTypeFilter;
  onWatchTypeFilterChange: (filter: WatchTypeFilter) => void;
  favoriteTeamId?: number | null;
  publicScheduleOnly?: boolean;
  outcomeFilter: CalendarOutcomeFilter;
  outcomeCounts: CalendarOutcomeCounts;
  onOutcomeFilterChange: (filter: CalendarOutcomeFilter) => void;
};

export function CalendarFilterBar({
  layout,
  viewMode,
  onViewModeChange,
  scheduleFilter,
  onScheduleFilterChange,
  watchTypeFilter,
  onWatchTypeFilterChange,
  favoriteTeamId,
  publicScheduleOnly = false,
  outcomeFilter,
  outcomeCounts,
  onOutcomeFilterChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (layout !== 'mobile' || !expanded) {
      return undefined;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    }

    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);
  }, [expanded, layout]);

  const summary = publicScheduleOnly
    ? `${viewMode === 'month' ? '월간' : '주간'} · 리그 전체`
    : `${viewMode === 'month' ? '월간' : '주간'} · ${SCHEDULE_LABELS[scheduleFilter]} · ${WATCH_LABELS[watchTypeFilter]}${
        outcomeFilter === 'all'
          ? ''
          : ` · ${
              outcomeFilter === 'scheduled'
                ? '경기전'
                : outcomeFilter === 'cancelled'
                  ? '취소'
                  : outcomeFilter === 'win'
                    ? '승'
                    : outcomeFilter === 'lose'
                      ? '패'
                      : '무'
            }`
      }`;

  function collapseIfMobile() {
    if (layout === 'mobile') {
      setExpanded(false);
    }
  }

  const outcomeLegend = favoriteTeamId ? (
    <div className="calendar-filter-legend-block">
      <span className="filter-group-label">경기 결과</span>
      <CalendarOutcomeLegend
        counts={outcomeCounts}
        onChange={(filter) => {
          onOutcomeFilterChange(filter);
          collapseIfMobile();
        }}
        selected={outcomeFilter}
      />
    </div>
  ) : null;

  const filterGroups = (
    <>
      <fieldset className="calendar-filter-group" data-layout="split">
        <legend className="calendar-filter-group__label">기간</legend>
        <div className="calendar-filter-options">
          {(['month', 'week'] as const).map((mode) => {
            const selected = viewMode === mode;

            return (
              <button
                aria-pressed={selected}
                className={`calendar-filter-choice${selected ? ' is-selected' : ''}`}
                key={mode}
                onClick={() => {
                  onViewModeChange(mode);
                  collapseIfMobile();
                }}
                type="button"
              >
                <strong>{mode === 'month' ? '월간' : '주간'}</strong>
                <small>{mode === 'month' ? '한 달' : '한 주'}</small>
              </button>
            );
          })}
        </div>
      </fieldset>
      {publicScheduleOnly ? null : (
        <fieldset className="calendar-filter-group" data-layout="rows">
          <legend className="calendar-filter-group__label">경기 범위</legend>
          <div className="calendar-filter-options">
            {(['favorite', 'favorite-home', 'all'] as const).map((filter) => {
              const selected = scheduleFilter === filter;

              return (
                <button
                  aria-pressed={selected}
                  className={`calendar-filter-choice${selected ? ' is-selected' : ''}`}
                  disabled={filter !== 'all' && !favoriteTeamId}
                  key={filter}
                  onClick={() => {
                    onScheduleFilterChange(filter);
                    collapseIfMobile();
                  }}
                  type="button"
                >
                  <span aria-hidden className="calendar-filter-choice__mark" />
                  <span className="calendar-filter-choice__copy">
                    <strong>{SCHEDULE_LABELS[filter]}</strong>
                    <small>{SCHEDULE_DESCRIPTIONS[filter]}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {publicScheduleOnly ? (
        <fieldset className="calendar-filter-group" data-layout="rows">
          <legend className="calendar-filter-group__label">경기 범위</legend>
          <div className="calendar-filter-options">
            <button
              aria-pressed="true"
              className="calendar-filter-choice is-selected"
              disabled
              type="button"
            >
              <span aria-hidden className="calendar-filter-choice__mark" />
              <span className="calendar-filter-choice__copy">
                <strong>리그 전체</strong>
                <small>KBO 모든 구단</small>
              </span>
            </button>
          </div>
        </fieldset>
      ) : null}
      {publicScheduleOnly ? null : (
        <fieldset className="calendar-filter-group" data-layout="segments">
          <legend className="calendar-filter-group__label">관람 기록</legend>
          <div className="calendar-filter-options">
            {(['all', 'stadium', 'home'] as const).map((type) => {
              const selected = watchTypeFilter === type;

              return (
                <button
                  aria-pressed={selected}
                  className={`calendar-filter-choice${selected ? ' is-selected' : ''}`}
                  key={type}
                  onClick={() => {
                    onWatchTypeFilterChange(type);
                    collapseIfMobile();
                  }}
                  type="button"
                >
                  <strong>{WATCH_LABELS[type]}</strong>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </>
  );

  if (layout === 'mobile') {
    return (
      <>
        {expanded ? (
          <button
            aria-label="필터 닫기"
            className="calendar-filter-dock__backdrop"
            onClick={() => setExpanded(false)}
            type="button"
          />
        ) : null}
        <section
          aria-label="캘린더 필터"
          className={`calendar-filter-dock${expanded ? ' is-expanded' : ''}`}
        >
          <button
            aria-controls="calendar-mobile-filter-panel"
            aria-expanded={expanded}
            className="calendar-filter-dock__toggle"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            <span className="calendar-filter-dock__label">필터</span>
            <span className="calendar-filter-dock__summary">{summary}</span>
            <span aria-hidden className="calendar-filter-dock__chevron">
              {expanded ? '▲' : '▼'}
            </span>
          </button>
          {expanded ? (
            <div
              className="calendar-filter-dock__panel"
              id="calendar-mobile-filter-panel"
            >
              <div className="calendar-filter-groups">{filterGroups}</div>
              {outcomeLegend}
            </div>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <section aria-label="캘린더 필터" className="calendar-filter-panel">
      <header className="calendar-filter-panel__header">
        <span>Calendar view</span>
        <strong>일정 보기</strong>
        <p>{summary}</p>
      </header>
      <div className="calendar-filter-groups">{filterGroups}</div>
      {outcomeLegend}
    </section>
  );
}

export function getCalendarViewAnchorDate(
  mode: ViewMode,
  currentAnchor: Date,
): Date {
  return mode === 'month'
    ? getMonthStart(currentAnchor)
    : getWeekStart(currentAnchor);
}
