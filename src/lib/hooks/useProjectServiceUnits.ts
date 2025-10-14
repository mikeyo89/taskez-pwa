'use client';

import Dexie, { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listProjectServiceUnits } from '@/lib/actions/projects';
import { db } from '@/lib/db';
import type { ProjectServiceUnit } from '@/lib/models';

export function useProjectServiceUnits(projectServiceId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['project-services', projectServiceId, 'units'],
    queryFn: () => {
      if (!projectServiceId) return Promise.resolve<ProjectServiceUnit[]>([]);
      return listProjectServiceUnits(projectServiceId).then(sortUnits);
    },
    enabled: Boolean(projectServiceId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!projectServiceId) return;

    const subscription = liveQuery(() =>
      db.projectServiceUnits
        .where('[project_service_id+updated_at]')
        .between([projectServiceId, Dexie.minKey], [projectServiceId, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        queryClient.setQueryData<ProjectServiceUnit[]>(
          ['project-services', projectServiceId, 'units'],
          sortUnits(rows)
        );
      },
      error: (error) => console.error('liveQuery projectServiceUnits error', error)
    });

    return () => subscription.unsubscribe();
  }, [projectServiceId, queryClient]);

  return query;
}

function sortUnits(rows: ProjectServiceUnit[]): ProjectServiceUnit[] {
  return [...rows].sort((a, b) => {
    const aTime = getDateValue(a.est_completion_date);
    const bTime = getDateValue(b.est_completion_date);
    return bTime - aTime;
  });
}

function getDateValue(value: string) {
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}
