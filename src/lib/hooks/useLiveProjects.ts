'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { db } from '../db';
import type { Project } from '../models';

export function useLiveProjects() {
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.projects.orderBy('updated_at').reverse().toArray()
    ).subscribe({
      next: (rows) => {
        setData(rows);
        setLoading(false);
      },
      error: (error) => {
        console.error('liveQuery projects error', error);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data, loading };
}
