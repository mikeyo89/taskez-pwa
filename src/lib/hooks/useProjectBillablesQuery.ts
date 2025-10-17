'use client';

import { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listProjectBillables, type ProjectBillableWithUnits } from '@/lib/actions/projects';

export function useProjectBillablesQuery(projectId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['projects', projectId, 'billables'],
    queryFn: () => {
      if (!projectId) return Promise.resolve<ProjectBillableWithUnits[]>([]);
      return listProjectBillables(projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!projectId) return;

    const subscription = liveQuery(() => listProjectBillables(projectId)).subscribe({
      next: (rows) => {
        queryClient.setQueryData<ProjectBillableWithUnits[]>(
          ['projects', projectId, 'billables'],
          rows
        );
      },
      error: (error) => console.error('liveQuery projectBillables error', error)
    });

    return () => subscription.unsubscribe();
  }, [projectId, queryClient]);

  return query;
}
