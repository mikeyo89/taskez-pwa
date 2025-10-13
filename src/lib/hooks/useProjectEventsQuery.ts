'use client';

import Dexie, { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listProjectEvents } from '@/lib/actions/projects';
import { db } from '@/lib/db';
import type { ProjectEvent } from '@/lib/models';

export function useProjectEventsQuery(projectId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['projects', projectId, 'events'],
    queryFn: () => {
      if (!projectId) return Promise.resolve<ProjectEvent[]>([]);
      return listProjectEvents(projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!projectId) return;

    const subscription = liveQuery(() =>
      db.projectEvents
        .where('[project_id+updated_at]')
        .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        queryClient.setQueryData<ProjectEvent[]>(
          ['projects', projectId, 'events'],
          rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
        );
      },
      error: (error) => console.error('liveQuery projectEvents error', error)
    });

    return () => subscription.unsubscribe();
  }, [projectId, queryClient]);

  return query;
}
