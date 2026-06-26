import type { TeamChampionshipHistory } from './baseball-api';

export function formatKboChampionshipLabel({
  targetTitle = 1,
  lastTitleYear = null,
}: Partial<TeamChampionshipHistory> = {}) {
  if (!lastTitleYear) {
    return `V${targetTitle} · 우승 없음`;
  }

  return `V${targetTitle} · 최근 ${lastTitleYear} 우승`;
}
