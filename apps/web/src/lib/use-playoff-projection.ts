'use client';

import { useEffect, useRef, useState } from 'react';
import type { Game, TeamStandingsResponse } from '@/lib/baseball-api';
import {
  calculatePlayoffProbabilityProjection,
  type PlayoffProbabilityProjection,
} from '@/lib/playoff-probability';
import type {
  PlayoffWorkerRequest,
  PlayoffWorkerResponse,
} from '@/lib/playoff-worker';

type PlayoffProjectionState = {
  projection: PlayoffProbabilityProjection | null;
  isComputing: boolean;
};

/**
 * 가을야구 진출 확률(10만 회 몬테카를로)을 Web Worker로 분리해 메인 스레드
 * 블로킹 없이 계산한다. 워커를 못 쓰는 환경에서는 동기 계산으로 폴백한다.
 */
export function usePlayoffProjection(
  standings: TeamStandingsResponse | null,
  games: Game[] | undefined,
): PlayoffProjectionState {
  const [projection, setProjection] =
    useState<PlayoffProbabilityProjection | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    const worker = new Worker(new URL('./playoff-worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<PlayoffWorkerResponse>) => {
      if (event.data.requestId !== requestIdRef.current) {
        return;
      }

      setProjection(event.data.projection);
      setIsComputing(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!standings || games === undefined) {
      setProjection(null);
      setIsComputing(false);
      return;
    }

    const worker = workerRef.current;

    if (!worker) {
      setProjection(calculatePlayoffProbabilityProjection(standings, games));
      setIsComputing(false);
      return;
    }

    setIsComputing(true);
    worker.postMessage({
      requestId,
      standings,
      games,
    } satisfies PlayoffWorkerRequest);
  }, [standings, games]);

  return { projection, isComputing };
}
