'use client';

import Dexie, { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listMembersByClient } from '@/lib/actions/clients';
import { db } from '@/lib/db';
import type { Member } from '@/lib/models';

export function useClientMembersQuery(clientId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clients', clientId, 'members'],
    queryFn: () => {
      if (!clientId) return Promise.resolve<Member[]>([]);
      return listMembersByClient(clientId);
    },
    enabled: Boolean(clientId),
    staleTime: 1_000 * 15
  });

  useEffect(() => {
    if (!clientId) return;

    const subscription = liveQuery(() =>
      db.members
        .where('[client_id+last_name]')
        .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        queryClient.setQueryData<Member[]>(['clients', clientId, 'members'], rows);
      },
      error: (error) => {
        console.error('liveQuery members error', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [clientId, queryClient]);

  return query;
}
