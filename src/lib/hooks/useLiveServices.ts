'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { db } from '../db';
import type { Service } from '../models';

export function useLiveServices() {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() => db.services.orderBy('updated_at').reverse().toArray()).subscribe({
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
