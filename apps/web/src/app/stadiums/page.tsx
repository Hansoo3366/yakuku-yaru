import { QuerySeed } from '@/components/QuerySeed';
import { queryKeys } from '@/lib/query-keys';
import { listPublicTeams, requestPublic } from '@/lib/server-baseball-api';
import type { StadiumSummary } from '@/lib/stadium-note-api';
import StadiumsPageClient from './StadiumsPageClient';

/** 구장 목록과 팬 메모 수를 서버에서 먼저 받아 첫 HTML 에 담는다. */
export default async function StadiumsPage() {
  const [stadiums, teams] = await Promise.all([
    requestPublic<{ items: StadiumSummary[] }>('/stadiums', 60),
    listPublicTeams(),
  ]);

  return (
    <QuerySeed
      entries={[
        { queryKey: queryKeys.teams(), data: teams },
        { queryKey: queryKeys.stadiums(), data: stadiums },
      ]}
    >
      <StadiumsPageClient />
    </QuerySeed>
  );
}
