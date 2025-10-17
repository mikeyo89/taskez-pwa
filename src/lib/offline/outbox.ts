'use client';

import { db } from '../db';
import type { OutboxAction, OutboxEntity, OutboxEntry } from '../models';

const nowISO = () => new Date().toISOString();

export async function queueOutboxMutation(
  entity: OutboxEntity,
  action: OutboxAction,
  payload: unknown,
  entityId: string,
  options?: { idempotencyKey?: string }
): Promise<string> {
  const idempotencyKey = options?.idempotencyKey ?? `${entity}:${entityId}:${action}`;
  const timestamp = nowISO();
  const existing = await db.outbox.where('idempotency_key').equals(idempotencyKey).first();
  if (existing) {
    await db.outbox.update(existing.op_id, {
      payload,
      action,
      status: 'pending',
      last_error: null,
      updated_at: timestamp
    });
    return existing.op_id;
  }

  const entry: OutboxEntry = {
    op_id: crypto.randomUUID(),
    entity,
    entity_id: entityId,
    action,
    payload,
    idempotency_key: idempotencyKey,
    status: 'pending',
    last_error: null,
    created_at: timestamp,
    updated_at: timestamp
  };
  await db.outbox.add(entry);
  return entry.op_id;
}

export async function markOutboxProcessed(opId: string) {
  await db.outbox.delete(opId);
}

export async function markOutboxFailed(opId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error');
  await db.outbox.update(opId, {
    status: 'failed',
    last_error: message,
    updated_at: nowISO()
  });
}

export async function resetFailedOutboxEntries() {
  const timestamp = nowISO();
  await db.outbox
    .where('status')
    .equals('failed')
    .modify((entry) => {
      entry.status = 'pending';
      entry.last_error = null;
      entry.updated_at = timestamp;
    });
}
