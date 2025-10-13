'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { db } from '../db';
import type { Client } from '../models';

export function useLiveClientGroups() {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.clientGroups.orderBy('updated_at').reverse().toArray()
    ).subscribe({
      next: (rows) => {
        setData(rows);
        setLoading(false);
      },
      error: (error) => console.error('liveQuery clientGroups error', error)
    });

    return () => sub.unsubscribe();
  }, []);

  return { data, loading };
}
