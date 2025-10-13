'use client';

import Dexie, { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listProjectsByClientGroup } from '@/lib/actions/projects';
import { db } from '@/lib/db';
import type { Project } from '@/lib/models';

export function useClientProjectsQuery(clientGroupId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-groups', clientGroupId, 'projects'],
    queryFn: () => {
      if (!clientGroupId) return Promise.resolve<Project[]>([]);
      return listProjectsByClientGroup(clientGroupId);
    },
    enabled: Boolean(clientGroupId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!clientGroupId) return;

    const subscription = liveQuery(() =>
      db.projects
        .where('[group_id+updated_at]')
        .between([clientGroupId, Dexie.minKey], [clientGroupId, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        queryClient.setQueryData<Project[]>(
          ['client-groups', clientGroupId, 'projects'],
          rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
        );
      },
      error: (error) => {
        console.error('liveQuery projects error', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [clientGroupId, queryClient]);

  return query;
}
