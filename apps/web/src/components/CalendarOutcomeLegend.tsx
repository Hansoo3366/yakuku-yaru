const items = [
  { outcome: 'win', label: '승' },
  { outcome: 'lose', label: '패' },
  { outcome: 'draw', label: '무' },
  { outcome: 'cancelled', label: '취소' },
  { outcome: 'scheduled', label: '예정' },
] as const;

export function CalendarOutcomeLegend() {
  return (
    <div
      aria-label="내 팀 경기 결과 색상"
      className="calendar-outcome-legend"
      role="list"
    >
      {items.map((item) => (
        <span className="calendar-outcome-legend-item" key={item.outcome} role="listitem">
          <span
            aria-hidden="true"
            className="calendar-outcome-swatch"
            data-outcome={item.outcome}
          />
          <span className="sr-only">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
