'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { db } from '../db';
import type { Service } from '../models';

export function useLiveServiceCategories() {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.serviceCategories.orderBy('updated_at').reverse().toArray()
    ).subscribe({
      next: (rows) => {
        setData(rows);
        setLoading(false);
      },
      error: (error) => console.error('liveQuery serviceCategories error', error)
    });

    return () => sub.unsubscribe();
  }, []);

  return { data, loading };
}
