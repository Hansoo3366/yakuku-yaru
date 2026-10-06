import { QuerySeed } from '@/components/QuerySeed';
import { getKoreaDateString } from '@/lib/date-format';
import { queryKeys } from '@/lib/query-keys';
import { getCalendarGridRange } from '@/lib/calendar-range';
import { listPublicGames, listPublicTeams } from '@/lib/server-baseball-api';
import CalendarPageClient from './CalendarPageClient';

/** 한국 시간 기준 이번 달 달력 격자의 조회 범위. 클라이언트와 같은 함수로 계산해 쿼리 키가 맞는다. */
function getKoreaCalendarGridRange() {
  const [year, month] = getKoreaDateString().split('-').map(Number);
  return getCalendarGridRange(new Date(year, month - 1, 1));
}

/** 이번 달 달력에 보이는 리그 전체 일정을 서버에서 먼저 받아 첫 HTML 에 담는다. */
export default async function CalendarPage() {
  const range = getKoreaCalendarGridRange();
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
