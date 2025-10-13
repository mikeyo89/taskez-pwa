'use client';

import Dexie from 'dexie';
import { db } from '../db';
import { ClientSchema, MemberSchema, type Client, type Member } from '../models';

const nowISO = () => new Date().toISOString();

export async function createClientGroup(input: {
  name: string;
  description?: string;
}): Promise<Client> {
  const entity: Client = ClientSchema.parse({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    created_at: nowISO(),
    updated_at: nowISO()
  });
  await db.clientGroups.add(entity);
  return entity;
}

export async function updateClientGroup(
  id: string,
  patch: Partial<Pick<Client, 'name' | 'description'>>
): Promise<Client> {
  const existing = await db.clientGroups.get(id);
  if (!existing) throw new Error('Client group not found');
  const updated: Client = ClientSchema.parse({
    ...existing,
    ...('name' in patch ? { name: patch.name!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.clientGroups.put(updated);
  return updated;
}

export async function deleteClientGroup(id: string): Promise<void> {
  await db.transaction('rw', db.clientGroups, db.clientContacts, async () => {
    const contacts = db.clientContacts.where('client_id').equals(id);
    await contacts.delete();
    await db.clientGroups.delete(id);
  });
}

export async function listClientGroups(): Promise<Client[]> {
  return db.clientGroups.orderBy('updated_at').reverse().toArray();
}

export async function getClientGroup(id: string): Promise<Client | undefined> {
  return db.clientGroups.get(id);
}

export async function addClientContact(
  clientId: string,
  input: Omit<Member, 'id' | 'client_id' | 'created_at' | 'updated_at'>
): Promise<Member> {
  const entity: Member = MemberSchema.parse({
    id: crypto.randomUUID(),
    client_id: clientId,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email.trim(),
    phone: (input.phone ?? '').trim(),
    created_at: nowISO(),
    updated_at: nowISO()
  });
  await db.clientContacts.add(entity);
  await db.clientGroups.update(clientId, { updated_at: nowISO() });
  return entity;
}

export async function listClientContacts(clientId: string): Promise<Member[]> {
  return db.clientContacts
    .where('[client_id+last_name]')
    .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
    .toArray();
}

export async function updateClientContact(
  id: string,
  patch: Partial<Omit<Member, 'id' | 'client_id' | 'created_at'>>
): Promise<Member> {
  const existing = await db.clientContacts.get(id);
  if (!existing) throw new Error('Client contact not found');
  const updated: Member = MemberSchema.parse({
    ...existing,
    ...('first_name' in patch ? { first_name: patch.first_name!.trim() } : {}),
    ...('last_name' in patch ? { last_name: patch.last_name!.trim() } : {}),
    ...('email' in patch ? { email: patch.email!.trim() } : {}),
    ...('phone' in patch ? { phone: (patch.phone ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.clientContacts.put(updated);
  await db.clientGroups.update(existing.client_id, { updated_at: nowISO() });
  return updated;
}

export async function deleteClientContact(id: string): Promise<void> {
  const existing = await db.clientContacts.get(id);
  await db.clientContacts.delete(id);
  if (existing) {
    await db.clientGroups.update(existing.client_id, { updated_at: nowISO() });
  }
}
