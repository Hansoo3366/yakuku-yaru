'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_LOGOUT_EVENT } from '@/lib/auth';
import { useAuthStore } from '@/lib/auth-store';

export function useAuthGuard(redirectTo = '/') {
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    function redirectIfGuest() {
      if (hasHydrated && !token) {
        router.replace(redirectTo);
      }
    }

    redirectIfGuest();
    window.addEventListener(AUTH_LOGOUT_EVENT, redirectIfGuest);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, redirectIfGuest);
  }, [hasHydrated, redirectTo, router, token]);
}
