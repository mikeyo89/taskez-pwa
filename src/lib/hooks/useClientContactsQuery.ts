'use client';

import Dexie, { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listClientContacts } from '@/lib/actions/clientGroups';
import { db } from '@/lib/db';
import type { Member } from '@/lib/models';

export function useClientContactsQuery(clientGroupId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['client-groups', clientGroupId, 'contacts'],
    queryFn: () => {
      if (!clientGroupId) return Promise.resolve<Member[]>([]);
      return listClientContacts(clientGroupId);
    },
    enabled: Boolean(clientGroupId),
    staleTime: 15_000
  });

  useEffect(() => {
    if (!clientGroupId) return;

    const subscription = liveQuery(() =>
      db.clientContacts
        .where('[client_id+last_name]')
        .between([clientGroupId, Dexie.minKey], [clientGroupId, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        queryClient.setQueryData<Member[]>(
          ['client-groups', clientGroupId, 'contacts'],
          rows
        );
      },
      error: (error) => {
        console.error('liveQuery clientContacts error', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [clientGroupId, queryClient]);

  return query;
}
