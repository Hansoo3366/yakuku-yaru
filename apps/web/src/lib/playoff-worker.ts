import type { Game, TeamStandingsResponse } from './baseball-api';
import { calculatePlayoffProbabilityProjection } from './playoff-probability';

export type PlayoffWorkerRequest = {
  requestId: number;
  standings: TeamStandingsResponse | null;
  games: Game[];
};

export type PlayoffWorkerResponse = {
  requestId: number;
  projection: ReturnType<typeof calculatePlayoffProbabilityProjection>;
};

// DOM lib의 Worker 타입으로 캐스팅해 webworker lib 충돌 없이 postMessage/onmessage 사용.
const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<PlayoffWorkerRequest>) => {
  const { requestId, standings, games } = event.data;
  const projection = calculatePlayoffProbabilityProjection(standings, games);

  ctx.postMessage({ requestId, projection } satisfies PlayoffWorkerResponse);
};
