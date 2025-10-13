'use client';

import Dexie from 'dexie';
import { db } from '../db';
import { ClientSchema, MemberSchema, type Client, type Member } from '../models';

const nowISO = () => new Date().toISOString();

export async function createClient(input: { name: string; description?: string }): Promise<Client> {
  const entity: Client = ClientSchema.parse({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    created_at: nowISO(),
    updated_at: nowISO()
  });
  await db.clients.add(entity);
  return entity;
}

export async function updateClient(
  id: string,
  patch: Partial<Pick<Client, 'name' | 'description'>>
): Promise<Client> {
  const existing = await db.clients.get(id);
  if (!existing) throw new Error('Client not found');
  const updated: Client = ClientSchema.parse({
    ...existing,
    ...('name' in patch ? { name: patch.name!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.clients.put(updated);
  return updated;
}

export async function deleteClient(id: string): Promise<void> {
  // Transaction: delete client and its members atomically
  await db.transaction('rw', db.clients, db.members, async () => {
    await db.members.where('client_id').equals(id).delete();
    await db.clients.delete(id);
  });
}

export async function listClients(): Promise<Client[]> {
  // Example: sort by updated_at desc
  return db.clients.orderBy('updated_at').reverse().toArray();
}

export async function getClient(id: string): Promise<Client | undefined> {
  return db.clients.get(id);
}

// ---- Members ----
export async function addMember(
  client_id: string,
  input: Omit<Member, 'id' | 'client_id' | 'created_at' | 'updated_at'>
): Promise<Member> {
  const entity: Member = MemberSchema.parse({
    id: crypto.randomUUID(),
    client_id,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email.trim(),
    phone: (input.phone ?? '').trim(),
    created_at: nowISO(),
    updated_at: nowISO()
  });
  await db.members.add(entity);
  // Optionally bump parent updated_at for “recently updated” sorting
  await db.clients.update(client_id, { updated_at: nowISO() });
  return entity;
}

export async function listMembersByClient(client_id: string): Promise<Member[]> {
  // Use compound index for predictable ordering
  return db.members
    .where('[client_id+last_name]')
    .between([client_id, Dexie.minKey], [client_id, Dexie.maxKey])
    .toArray();
}

export async function updateMember(
  id: string,
  patch: Partial<Omit<Member, 'id' | 'client_id' | 'created_at'>>
): Promise<Member> {
  const existing = await db.members.get(id);
  if (!existing) throw new Error('Member not found');
  const updated: Member = MemberSchema.parse({
    ...existing,
    ...patch,
    updated_at: nowISO()
  });
  await db.members.put(updated);
  await db.clients.update(existing.client_id, { updated_at: nowISO() });
  return updated;
}

export async function deleteMember(id: string): Promise<void> {
  const existing = await db.members.get(id);
  await db.members.delete(id);
  if (existing) await db.clients.update(existing.client_id, { updated_at: nowISO() });
}
