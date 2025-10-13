'use client';

import { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listProjectServicesWithChildren } from '@/lib/actions/projects';
import type { ProjectServiceWithChildren } from '@/lib/actions/projects';

export function useProjectServicesQuery(projectId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['projects', projectId, 'services'],
    queryFn: () => {
      if (!projectId) return Promise.resolve<ProjectServiceWithChildren[]>([]);
      return listProjectServicesWithChildren(projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!projectId) return;

    const subscription = liveQuery(() => listProjectServicesWithChildren(projectId)).subscribe({
      next: (rows) => {
        queryClient.setQueryData<ProjectServiceWithChildren[]>(
          ['projects', projectId, 'services'],
          rows
        );
      },
      error: (error) => console.error('liveQuery projectServices error', error)
    });

    return () => subscription.unsubscribe();
  }, [projectId, queryClient]);

  return query;
}
