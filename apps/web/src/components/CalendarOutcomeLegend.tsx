'use client';

import type { GameOutcome } from '@/lib/game-outcome';

export type CalendarOutcomeFilter = Exclude<GameOutcome, 'unknown'> | 'all';
export type CalendarOutcomeCounts = Record<
  Exclude<CalendarOutcomeFilter, 'all'>,
  number
>;

const items: Array<{
  outcome: CalendarOutcomeFilter;
  label: string;
}> = [
  { outcome: 'all', label: '전체 결과' },
  { outcome: 'win', label: '승' },
  { outcome: 'lose', label: '패' },
  { outcome: 'draw', label: '무' },
  { outcome: 'cancelled', label: '취소' },
  { outcome: 'scheduled', label: '경기전' },
];

type Props = {
  counts: CalendarOutcomeCounts;
  onChange: (outcome: CalendarOutcomeFilter) => void;
  selected: CalendarOutcomeFilter;
};

export function CalendarOutcomeLegend({ counts, onChange, selected }: Props) {
  return (
    <div
      aria-label="경기 결과 필터"
      className="calendar-outcome-legend"
    >
      {items.map((item) => {
        const isAll = item.outcome === 'all';
        const count = item.outcome === 'all'
          ? Object.values(counts).reduce((total, value) => total + value, 0)
          : counts[item.outcome];

        return (
          <button
            aria-pressed={selected === item.outcome}
            className={`calendar-outcome-legend-item${
              selected === item.outcome ? ' is-selected' : ''
            }${isAll ? ' is-all' : ''}`}
            data-outcome={item.outcome}
            key={item.outcome}
            onClick={() => onChange(item.outcome)}
            type="button"
          >
            {isAll ? null : (
              <span
                aria-hidden="true"
                className="calendar-outcome-swatch"
                data-outcome={item.outcome}
              />
            )}
          <span className="calendar-outcome-legend-label">{item.label}</span>
            <strong>{count}</strong>
          </button>
        );
      })}
    </div>
  );
}
