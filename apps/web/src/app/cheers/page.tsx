import { QuerySeed } from '@/components/QuerySeed';
import type {
  PlayerCheerListResponse,
  TeamCheer,
} from '@/lib/player-cheer-api';
import { queryKeys } from '@/lib/query-keys';
import { listPublicTeams, requestPublic } from '@/lib/server-baseball-api';
import CheersPageClient from './CheersPageClient';

/** 첫 화면(최근 라인업 1쪽)과 같은 조건. CheersPageClient 의 초기 상태와 맞춘다. */
const INITIAL_CHEERS_INPUT = {
  keyword: '',
  onlyWithCheer: false,
  page: 1,
  rosterScope: 'recentLineup',
  size: 18,
  teamId: null,
} as const;

export default async function CheersPage() {
  const [teams, teamCheers, playerCheers] = await Promise.all([
    listPublicTeams(),
    requestPublic<{ items: TeamCheer[] }>('/player-cheers/teams', 60 * 10),
    requestPublic<PlayerCheerListResponse>(
      `/player-cheers?page=${INITIAL_CHEERS_INPUT.page}&rosterScope=${INITIAL_CHEERS_INPUT.rosterScope}&size=${INITIAL_CHEERS_INPUT.size}`,
      60 * 10,
    ),
  ]);

  return (
    <QuerySeed
      entries={[
        { queryKey: queryKeys.teams(), data: teams },
        { queryKey: queryKeys.teamCheers(), data: teamCheers },
        {
          queryKey: queryKeys.playerCheers(INITIAL_CHEERS_INPUT),
          data: playerCheers,
        },
      ]}
    >
      <CheersPageClient />
    </QuerySeed>
  );
}
