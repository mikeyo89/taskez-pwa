'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Dexie, { liveQuery } from 'dexie';
import { useEffect } from 'react';

import { listProjectsByClient } from '@/lib/actions/projects';
import { db } from '@/lib/db';
import type { Project } from '@/lib/models';

export function useProjectsQuery(clientId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clients', clientId, 'projects'],
    queryFn: () => {
      if (!clientId) return Promise.resolve<Project[]>([]);
      return listProjectsByClient(clientId);
    },
    enabled: Boolean(clientId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!clientId) return;

    const subscription = liveQuery(() =>
      db.projects
        .where('[client_id+updated_at]')
        .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        const sorted = [...rows].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
        queryClient.setQueryData<Project[]>(['clients', clientId, 'projects'], sorted);
      },
      error: (error) => {
        console.error('liveQuery projects error', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [clientId, queryClient]);

  return query;
}
