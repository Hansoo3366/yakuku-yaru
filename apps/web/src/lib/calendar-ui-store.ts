'use client';

import { create } from 'zustand';

export type CalendarViewMode = 'month' | 'week';
export type CalendarScheduleFilter = 'favorite' | 'favorite-home' | 'all';
export type CalendarWatchTypeFilter = 'all' | 'stadium' | 'home';

type CalendarUiState = {
  hasAppliedDefaultScheduleFilter: boolean;
  scheduleFilter: CalendarScheduleFilter;
  viewMode: CalendarViewMode;
  watchTypeFilter: CalendarWatchTypeFilter;
  markDefaultScheduleFilterApplied: () => void;
  setScheduleFilter: (filter: CalendarScheduleFilter) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setWatchTypeFilter: (filter: CalendarWatchTypeFilter) => void;
};

export const useCalendarUiStore = create<CalendarUiState>((set) => ({
  hasAppliedDefaultScheduleFilter: false,
  scheduleFilter: 'all',
  viewMode: 'month',
  watchTypeFilter: 'all',
  markDefaultScheduleFilterApplied: () =>
    set({ hasAppliedDefaultScheduleFilter: true }),
  setScheduleFilter: (scheduleFilter) => set({ scheduleFilter }),
  setViewMode: (viewMode) => set({ viewMode }),
  setWatchTypeFilter: (watchTypeFilter) => set({ watchTypeFilter }),
}));
