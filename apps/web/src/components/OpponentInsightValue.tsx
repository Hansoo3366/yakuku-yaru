import type { OpponentInsightItem } from '@/lib/calendar-opponent-insights';
import { getTeamLogoSrc } from '@/lib/team-logo';

type OpponentInsightValueProps = {
  item: OpponentInsightItem | null;
};

export function OpponentInsightValue({ item }: OpponentInsightValueProps) {
  if (!item) {
    return <strong className="calendar-opponent-insight">—</strong>;
  }

  const logoSrc = getTeamLogoSrc({ shortName: item.shortName });

  return (
    <strong className="calendar-opponent-insight">
      {logoSrc ? (
        <img
          alt=""
          className="calendar-opponent-insight__logo"
          src={logoSrc}
        />
      ) : null}
      <span className="calendar-opponent-insight__text">
        {item.shortName}
        <span className="calendar-opponent-insight__rate">{item.rate}%</span>
      </span>
    </strong>
  );
}
