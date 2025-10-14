'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { db } from '@/lib/db';
import type { Client, Project } from '@/lib/models';

type ProjectDetailSnapshot = {
  project?: Project;
  client?: Client;
};

export function useProjectDetail(projectId?: string) {
  const [snapshot, setSnapshot] = useState<ProjectDetailSnapshot>({});
  const [loading, setLoading] = useState(Boolean(projectId));

  useEffect(() => {
    if (!projectId) {
      setSnapshot({});
      setLoading(false);
      return;
    }

    setLoading(true);

    const subscription = liveQuery(async () => {
      const project = await db.projects.get(projectId);
      if (!project) return { project: undefined, client: undefined } satisfies ProjectDetailSnapshot;
      const client = await db.clients.get(project.client_id);
      return { project, client: client ?? undefined } satisfies ProjectDetailSnapshot;
    }).subscribe({
      next: (value) => {
        setSnapshot(value);
        setLoading(false);
      },
      error: (error) => console.error('liveQuery projectDetail error', error)
    });

    return () => subscription.unsubscribe();
  }, [projectId]);

  return {
    project: snapshot.project,
    client: snapshot.client,
    loading
  };
}
