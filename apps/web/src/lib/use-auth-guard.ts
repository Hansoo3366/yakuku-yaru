'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_LOGOUT_EVENT, getAccessToken } from '@/lib/auth';

export function useAuthGuard(redirectTo = '/') {
  const router = useRouter();

  useEffect(() => {
    function redirectIfGuest() {
      if (!getAccessToken()) {
        router.replace(redirectTo);
      }
    }

    redirectIfGuest();
    window.addEventListener(AUTH_LOGOUT_EVENT, redirectIfGuest);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, redirectIfGuest);
  }, [router, redirectTo]);
}
