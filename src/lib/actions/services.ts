'use Service';

import { db } from '../db';
import { ServiceSchema, type Service } from '../models';

const nowISO = () => new Date().toISOString();

export async function createService(input: {
  name: string;
  description?: string;
}): Promise<Service> {
  const entity: Service = ServiceSchema.parse({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    created_at: nowISO(),
    updated_at: nowISO()
  });
  await db.services.add(entity);
  return entity;
}

export async function updateService(
  id: string,
  patch: Partial<Pick<Service, 'name' | 'description'>>
): Promise<Service> {
  const existing = await db.services.get(id);
  if (!existing) throw new Error('Service not found');
  const updated: Service = ServiceSchema.parse({
    ...existing,
    ...('name' in patch ? { name: patch.name!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.services.put(updated);
  return updated;
}

export async function deleteService(id: string): Promise<void> {
  // Transaction: delete Service and its members atomically
  await db.transaction('rw', db.services, db.members, async () => {
    await db.members.where('Service_id').equals(id).delete();
    await db.services.delete(id);
  });
}

export async function listServices(): Promise<Service[]> {
  // Example: sort by updated_at desc
  return db.services.orderBy('updated_at').reverse().toArray();
}

export async function getService(id: string): Promise<Service | undefined> {
  return db.services.get(id);
}
