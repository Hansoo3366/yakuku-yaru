'use client';

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

type Props = {
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

/** 여러 선택지 중 하나를 고르는 묶음. 선택된 항목만 면이 올라온다. */
function Segment<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: (value: T) => boolean;
}) {
  return (
    <div aria-label={label} className="cal-seg" role="group">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          disabled={disabled?.(option.value)}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 달력 위에 가로 한 줄로 놓이는 필터.
 * 좁은 화면에서는 줄바꿈하지 않고 옆으로 밀어서 본다.
 */
export function CalendarFilterBar({
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
  return (
    <section aria-label="캘린더 필터" className="cal-filters">
      <Segment
        label="기간"
        onChange={onViewModeChange}
        options={[
          { value: 'month', label: '월간' },
          { value: 'week', label: '주간' },
        ]}
        value={viewMode}
      />
      {publicScheduleOnly ? null : (
        <>
          <Segment
            disabled={(filter) => filter !== 'all' && !favoriteTeamId}
            label="경기 범위"
            onChange={onScheduleFilterChange}
            options={(['favorite', 'favorite-home', 'all'] as const).map(
              (filter) => ({ value: filter, label: SCHEDULE_LABELS[filter] }),
            )}
            value={scheduleFilter}
          />
          <Segment
            label="관람 기록"
            onChange={onWatchTypeFilterChange}
            options={(['all', 'stadium', 'home'] as const).map((type) => ({
              value: type,
              label: type === 'all' ? '기록 전체' : WATCH_LABELS[type],
            }))}
            value={watchTypeFilter}
          />
        </>
      )}
      {favoriteTeamId ? (
        <CalendarOutcomeLegend
          counts={outcomeCounts}
          onChange={onOutcomeFilterChange}
          selected={outcomeFilter}
        />
      ) : null}
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
