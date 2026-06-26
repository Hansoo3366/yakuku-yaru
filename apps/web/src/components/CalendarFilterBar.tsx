'use client';

import { useState } from 'react';
import { CalendarOutcomeLegend } from '@/components/CalendarOutcomeLegend';
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
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const summary = publicScheduleOnly
    ? `${viewMode === 'month' ? '월간' : '주간'} · 리그 전체`
    : `${viewMode === 'month' ? '월간' : '주간'} · ${SCHEDULE_LABELS[scheduleFilter]} · ${WATCH_LABELS[watchTypeFilter]}`;

  function collapseIfMobile() {
    if (layout === 'mobile') {
      setExpanded(false);
    }
  }

  const outcomeLegend = favoriteTeamId ? (
    <div className="calendar-filter-legend-block">
      <span className="filter-group-label">결과</span>
      <CalendarOutcomeLegend />
    </div>
  ) : null;

  const filterGroups = (
    <>
      <div className="filter-group">
        <span className="filter-group-label">보기</span>
        <button
          className={`filter-pill ${viewMode === 'month' ? 'is-selected' : ''}`}
          onClick={() => {
            onViewModeChange('month');
            collapseIfMobile();
          }}
          type="button"
        >
          월간
        </button>
        <button
          className={`filter-pill ${viewMode === 'week' ? 'is-selected' : ''}`}
          onClick={() => {
            onViewModeChange('week');
            collapseIfMobile();
          }}
          type="button"
        >
          주간
        </button>
      </div>
      {publicScheduleOnly ? null : (
        <div className="filter-group">
          <span className="filter-group-label">경기</span>
          <button
            className={`filter-pill ${scheduleFilter === 'all' ? 'is-selected' : ''}`}
            onClick={() => {
              onScheduleFilterChange('all');
              collapseIfMobile();
            }}
            title="KBO 전체 팀 일정"
            type="button"
          >
            리그 전체
          </button>
          <button
            className={`filter-pill ${scheduleFilter === 'favorite' ? 'is-selected' : ''}`}
            disabled={!favoriteTeamId}
            onClick={() => {
              onScheduleFilterChange('favorite');
              collapseIfMobile();
            }}
            title="응원 팀 경기 전체 (홈·원정)"
            type="button"
          >
            응원팀
          </button>
          <button
            className={`filter-pill ${scheduleFilter === 'favorite-home' ? 'is-selected' : ''}`}
            disabled={!favoriteTeamId}
            onClick={() => {
              onScheduleFilterChange('favorite-home');
              collapseIfMobile();
            }}
            title="우리 팀이 홈팀인 경기만"
            type="button"
          >
            홈구장
          </button>
        </div>
      )}
      {publicScheduleOnly ? (
        <div className="filter-group">
          <span className="filter-group-label">경기</span>
          <button
            className="filter-pill is-selected"
            disabled
            title="KBO 전체 팀 일정"
            type="button"
          >
            리그 전체
          </button>
        </div>
      ) : null}
      {publicScheduleOnly ? null : (
        <div className="filter-group">
          <span className="filter-group-label">기록</span>
          {(['all', 'stadium', 'home'] as const).map((type) => (
            <button
              className={`filter-pill ${watchTypeFilter === type ? 'is-selected' : ''}`}
              key={type}
              onClick={() => {
                onWatchTypeFilterChange(type);
                collapseIfMobile();
              }}
              type="button"
            >
              {WATCH_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (layout === 'mobile') {
    return (
      <section
        aria-label="캘린더 필터"
        className={`calendar-filter-dock${expanded ? ' is-expanded' : ''}`}
      >
        <button
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
          <div className="calendar-filter-dock__panel">
            <div className="calendar-filter-groups">{filterGroups}</div>
            {outcomeLegend}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-label="캘린더 필터" className="calendar-filter-panel">
      <div className="calendar-filter-groups">{filterGroups}</div>
      {outcomeLegend}
    </section>
  );
}

export function getCalendarViewAnchorDate(
  mode: ViewMode,
  currentAnchor: Date,
): Date {
  return mode === 'month' ? getMonthStart(currentAnchor) : getWeekStart(new Date());
}
