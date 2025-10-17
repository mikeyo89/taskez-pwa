'use client';

import { DEFAULT_ACCENT } from '../appearance';
import { db } from '../db';
import { ProfileSchema, type Profile } from '../models';
import { queueOutboxMutation } from '../offline/outbox';

export const PROFILE_ID = 'profile';

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'company_name'
    | 'contact_name'
    | 'contact_email'
    | 'contact_phone'
    | 'company_color'
    | 'notifications_enabled'
  >
>;

const nowISO = () => new Date().toISOString();

type SanitizedPatch = Partial<Profile>;

function sanitizePatch(patch: ProfilePatch): SanitizedPatch {
  const sanitized: SanitizedPatch = {};

  if ('company_name' in patch) {
    sanitized.company_name = patch.company_name?.trim() ?? '';
  }

  if ('contact_name' in patch) {
    sanitized.contact_name = patch.contact_name?.trim() ?? '';
  }

  if ('contact_email' in patch) {
    const email = patch.contact_email?.trim() ?? '';
    sanitized.contact_email = email === '' ? '' : email.toLowerCase();
  }

  if ('contact_phone' in patch) {
    sanitized.contact_phone = patch.contact_phone?.trim() ?? '';
  }

  if (patch.company_color) {
    sanitized.company_color = patch.company_color;
  }

  if ('notifications_enabled' in patch) {
    sanitized.notifications_enabled = Boolean(patch.notifications_enabled);
  }

  return sanitized;
}

export function composeProfile(
  existing: Profile | undefined,
  patch: ProfilePatch,
  timestamp: string
): Profile {
  const sanitized = sanitizePatch(patch);
  const createdAt = existing?.created_at ?? timestamp;

  const base: Profile = existing
    ? existing
    : ProfileSchema.parse({
        id: PROFILE_ID,
        company_name: sanitized.company_name ?? '',
        contact_name: sanitized.contact_name ?? '',
        contact_email: sanitized.contact_email ?? '',
        contact_phone: sanitized.contact_phone ?? '',
        company_color: sanitized.company_color ?? DEFAULT_ACCENT,
        notifications_enabled: sanitized.notifications_enabled ?? false,
        created_at: createdAt,
        updated_at: timestamp
      });

  return ProfileSchema.parse({
    ...base,
    ...sanitized,
    id: PROFILE_ID,
    created_at: createdAt,
    updated_at: timestamp,
    company_color: sanitized.company_color ?? base.company_color,
    notifications_enabled: sanitized.notifications_enabled ?? base.notifications_enabled
  });
}

export async function upsertProfile(patch: ProfilePatch): Promise<Profile> {
  const existing = await db.profiles.get(PROFILE_ID);
  const now = nowISO();
  const profile = composeProfile(existing ?? undefined, patch, now);
  await db.profiles.put(profile);
  await queueOutboxMutation('profiles', existing ? 'update' : 'create', profile, PROFILE_ID);
  return profile;
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profiles.get(PROFILE_ID);
}
