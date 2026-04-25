'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useHouseholdStore } from '@/store/household';

/**
 * Bootstraps the user's household on first load:
 *  1. POST /api/households/bootstrap (idempotent)
 *  2. GET  /api/households → populate store
 */
export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        // 1. Bootstrap (creates default household + backfills items)
        await fetch('/api/households/bootstrap', { method: 'POST' });

        // 2. Fetch user's households
        const res = await fetch('/api/households');
        const data = await res.json();
        if (Array.isArray(data)) {
          useHouseholdStore.getState().setHouseholds(data);
        }
        useHouseholdStore.getState().setBootstrapped(true);
      } catch (e) {
        console.error('[HouseholdProvider] bootstrap error', e);
      }
    })();
  }, [user]);

  return <>{children}</>;
}
