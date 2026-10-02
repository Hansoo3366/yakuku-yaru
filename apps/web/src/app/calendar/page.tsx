import { QuerySeed } from '@/components/QuerySeed';
import { getKoreaDateString } from '@/lib/date-format';
import { queryKeys } from '@/lib/query-keys';
import { listPublicGames, listPublicTeams } from '@/lib/server-baseball-api';
import CalendarPageClient from './CalendarPageClient';

/** 한국 시간 기준 이번 달의 조회 범위. 클라이언트의 getMonthRange 와 같은 형식이다. */
function getKoreaMonthRange() {
  const [year, month] = getKoreaDateString().split('-').map(Number);
  const pad = (value: number) => String(value).padStart(2, '0');
  const next =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return {
    from: `${year}-${pad(month)}-01`,
    to: `${next.year}-${pad(next.month)}-01`,
  };
}

/** 이번 달 리그 전체 일정을 서버에서 먼저 받아 첫 HTML 에 담는다. */
export default async function CalendarPage() {
  const range = getKoreaMonthRange();
  const [games, teams] = await Promise.all([
    listPublicGames(range),
    listPublicTeams(),
  ]);

  return (
    <QuerySeed
      entries={[
        { queryKey: queryKeys.teams(), data: teams },
        {
          queryKey: queryKeys.games(range),
          data: games ? { items: games } : null,
        },
      ]}
    >
      <CalendarPageClient />
    </QuerySeed>
  );
}
