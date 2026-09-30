'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/**
 * 서버가 요청 쿠키로 판단한 로그인 여부. 인증 상태를 불러오기 전 첫 렌더에서
 * 비로그인 방문자에게 대시보드 뼈대 대신 바로 랜딩 화면을 그리는 데만 쓴다.
 */
const InitialSignedInContext = createContext(false);

export function useInitialSignedIn() {
  return useContext(InitialSignedInContext);
}

export function AppProviders({
  children,
  initialSignedIn,
}: {
  children: ReactNode;
  initialSignedIn: boolean;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60,
          },
        },
      }),
  );

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  return (
    <InitialSignedInContext.Provider value={initialSignedIn}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </InitialSignedInContext.Provider>
  );
}
