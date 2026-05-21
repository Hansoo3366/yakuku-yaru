'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // PWA should never block the app when registration fails.
    });
  }, []);

  return null;
}
