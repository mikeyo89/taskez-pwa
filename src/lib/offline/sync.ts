'use client';

import { z } from 'zod';

import { db } from '../db';
import {
  ClientSchema,
  MemberSchema,
  MetaEntrySchema,
  OutboxEntitySchema,
  type OutboxEntry,
  ProfileSchema,
  ProjectEventSchema,
  ProjectSchema,
  ProjectServiceExtraSchema,
  ProjectServiceSchema,
  ProjectServiceUnitSchema,
  ServiceSchema
} from '../models';
import { markOutboxFailed, markOutboxProcessed, resetFailedOutboxEntries } from './outbox';

const SYNC_CURSOR_KEY = 'sync:cursor';
const DEFAULT_OUTBOX_ENDPOINT = '/sync/outbox';
const DEFAULT_PULL_ENDPOINT = '/sync/pull';

const TABLE_CONFIG = {
  clients: { schema: ClientSchema, table: db.clients },
  members: { schema: MemberSchema, table: db.members },
  services: { schema: ServiceSchema, table: db.services },
  projects: { schema: ProjectSchema, table: db.projects },
  projectEvents: { schema: ProjectEventSchema, table: db.projectEvents },
  projectServices: { schema: ProjectServiceSchema, table: db.projectServices },
  projectServiceUnits: { schema: ProjectServiceUnitSchema, table: db.projectServiceUnits },
  projectServiceExtras: { schema: ProjectServiceExtraSchema, table: db.projectServiceExtras },
  profiles: { schema: ProfileSchema, table: db.profiles }
} as const;

type TableKey = keyof typeof TABLE_CONFIG;

const SyncPullPayloadSchema = z.object({
  cursor: z.string().optional(),
  deletions: z
    .array(
      z.object({
        entity: z.string(),
        ids: z.array(z.string())
      })
    )
    .optional()
});

function normalizedBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return base.replace(/\/$/, '');
}

async function getCursor(): Promise<string | undefined> {
  const row = await db.meta.get(SYNC_CURSOR_KEY);
  if (!row) return undefined;
  const parsed = MetaEntrySchema.safeParse(row);
  if (!parsed.success) return undefined;
  return parsed.data.value;
}

async function setCursor(value: string) {
  await db.meta.put({ key: SYNC_CURSOR_KEY, value });
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function resolveCollection(payload: Record<string, unknown>, key: TableKey): unknown[] | undefined {
  const camelCase = payload[key];
  if (Array.isArray(camelCase)) return camelCase as unknown[];
  const snakeCaseKey = toSnakeCase(key);
  const snakeCaseValue = payload[snakeCaseKey];
  if (Array.isArray(snakeCaseValue)) {
    return snakeCaseValue as unknown[];
  }
  return undefined;
}

function normalizeEntityKey(value: string): TableKey | undefined {
  const direct = OutboxEntitySchema.safeParse(value);
  if (direct.success) return direct.data;
  const camelCandidate = value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
  const alt = OutboxEntitySchema.safeParse(camelCandidate);
  return alt.success ? alt.data : undefined;
}

export async function syncWorkspace(options?: { signal?: AbortSignal }) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'offline' as const };
  }

  const baseUrl = normalizedBaseUrl();
  if (!baseUrl) {
    return { status: 'no-endpoint' as const };
  }

  await resetFailedOutboxEntries();

  const pending = await db.outbox.orderBy('created_at').toArray();
  for (const entry of pending) {
    try {
      await pushOutboxMutation(baseUrl, entry, options?.signal);
      await markOutboxProcessed(entry.op_id);
    } catch (error) {
      await markOutboxFailed(entry.op_id, error);
      return { status: 'error' as const, error };
    }
  }

  try {
    await pullServerDeltas(baseUrl, options?.signal);
  } catch (error) {
    return { status: 'error' as const, error };
  }

  return { status: 'complete' as const };
}

async function pushOutboxMutation(baseUrl: string, entry: OutboxEntry, signal?: AbortSignal) {
  const endpoint = new URL(DEFAULT_OUTBOX_ENDPOINT, baseUrl);
  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      entity: entry.entity,
      action: entry.action,
      entity_id: entry.entity_id,
      idempotency_key: entry.idempotency_key,
      payload: entry.payload
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Failed to push outbox mutation (${response.status})`);
  }
}

async function pullServerDeltas(baseUrl: string, signal?: AbortSignal) {
  const endpoint = new URL(DEFAULT_PULL_ENDPOINT, baseUrl);
  const cursor = await getCursor();
  if (cursor) {
    endpoint.searchParams.set('cursor', cursor);
  }

  const response = await fetch(endpoint.toString(), { signal });
  if (response.status === 204) {
    return;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch sync deltas (${response.status})`);
  }

  const rawPayload = (await response.json()) as Record<string, unknown>;
  const baseValidation = SyncPullPayloadSchema.safeParse(rawPayload);
  if (!baseValidation.success) {
    throw new Error('Received malformed sync payload');
  }

  await applyServerPayload(rawPayload);

  if (typeof baseValidation.data.cursor === 'string') {
    await setCursor(baseValidation.data.cursor);
  }
}

async function applyServerPayload(rawPayload: Record<string, unknown>) {
  const tables = Object.values(TABLE_CONFIG).map((config) => config.table);
  await db.transaction('rw', tables.concat([db.outbox, db.meta]), async () => {
    for (const key of Object.keys(TABLE_CONFIG) as TableKey[]) {
      const config = TABLE_CONFIG[key];
      const collection = resolveCollection(rawPayload, key);
      if (!collection?.length) continue;
      const parsed = config.schema.array().safeParse(collection);
      if (!parsed.success) continue;
      await config.table.bulkPut(parsed.data);
    }

    const deletions = rawPayload.deletions;
    if (Array.isArray(deletions)) {
      for (const deletion of deletions) {
        const entityKey = typeof deletion.entity === 'string' ? normalizeEntityKey(deletion.entity) : undefined;
        if (!entityKey) continue;
        const table = TABLE_CONFIG[entityKey]?.table;
        if (!table || !Array.isArray(deletion.ids)) continue;
        await table.bulkDelete(deletion.ids);
      }
    }
  });
}
