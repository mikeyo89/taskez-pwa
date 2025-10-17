'use client';

import { liveQuery } from 'dexie';
import { useEffect } from 'react';

import { db } from '@/lib/db';
import { syncWorkspace } from '@/lib/offline/sync';

const INITIAL_DELAY_MS = 2000;
const RETRY_DELAY_MS = 15000;
const OFFLINE_DELAY_MS = 10000;

export function useOutboxSync() {
  useEffect(() => {
    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const schedule = (delay: number) => {
      if (disposed) return;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(runSync, Math.max(0, delay));
    };

    const runSync = async () => {
      if (disposed || running) return;
      running = true;
      try {
        const result = await syncWorkspace();
        switch (result.status) {
          case 'offline':
            schedule(OFFLINE_DELAY_MS);
            break;
          case 'no-endpoint':
            schedule(RETRY_DELAY_MS * 2);
            break;
          case 'error':
            console.warn('Taskez sync failed', result.error);
            schedule(RETRY_DELAY_MS);
            break;
          default:
            schedule(RETRY_DELAY_MS);
            break;
        }
      } catch (error) {
        console.warn('Taskez sync threw an unexpected error', error);
        schedule(RETRY_DELAY_MS);
      } finally {
        running = false;
      }
    };

    const subscription = liveQuery(() => db.outbox.count()).subscribe({
      next: () => schedule(1000),
      error: (error) => console.error('Taskez outbox liveQuery error', error)
    });

    const handleOnline = () => schedule(0);
    window.addEventListener('online', handleOnline);

    schedule(INITIAL_DELAY_MS);

    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}
