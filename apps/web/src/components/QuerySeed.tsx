'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export type QuerySeedEntry = {
  queryKey: QueryKey;
  /** null 이면 서버에서 받지 못한 것이므로 건너뛰고, 클라이언트가 평소처럼 조회한다. */
  data: unknown;
};

/**
 * 서버 컴포넌트가 미리 받아 온 공개 데이터를 쿼리 캐시에 넣어 둔다.
 * 자식 컴포넌트의 useQuery 가 첫 렌더부터 데이터를 가지므로, 서버가 만든 HTML 에
 * 로딩 뼈대 대신 실제 내용이 담긴다. (JS 를 실행하지 않는 검색·AI 크롤러용)
 */
export function QuerySeed({
  entries,
  children,
}: {
  entries: QuerySeedEntry[];
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  // 자식의 useQuery 보다 먼저, 그리고 한 번만 실행되도록 state 초기화 시점에 넣는다.
  useState(() => {
    for (const entry of entries) {
      if (
        entry.data !== null &&
        entry.data !== undefined &&
        queryClient.getQueryData(entry.queryKey) === undefined
      ) {
        queryClient.setQueryData(entry.queryKey, entry.data);
      }
    }

    return true;
  });

  return children;
}
