'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { db } from '../db';
import type { Client } from '../models';

export function useLiveClients() {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() => db.clients.orderBy('updated_at').reverse().toArray()).subscribe({
      next: (rows) => {
        setData(rows);
        setLoading(false);
      },
      error: (e) => console.error('liveQuery error', e)
    });
    return () => sub.unsubscribe();
  }, []);

  return { data, loading };
}
