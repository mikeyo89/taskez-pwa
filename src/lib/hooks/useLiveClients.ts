'use client';

import Dexie, { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { db } from '../db';
import type { Client, Member } from '../models';

export function useLiveClients() {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() => db.clients.orderBy('updated_at').reverse().toArray()).subscribe({
      next: (rows) => {
        setData(rows);
        setLoading(false);
      },
      error: (e) => console.error('liveQuery error', e)
    });
    return () => sub.unsubscribe();
  }, []);

  return { data, loading };
}

export function useLiveClientMembers({ client_id }: { client_id: string }) {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.members
        .where('[client_id+last_name]')
        .between([client_id, Dexie.minKey], [client_id, Dexie.maxKey])
        .toArray()
    ).subscribe({
      next: (rows) => {
        setData(rows);
        setLoading(false);
      },
      error: (e) => console.error('liveQuery error', e)
    });
    return () => sub.unsubscribe();
  }, [client_id]);

  return { data, loading };
}
