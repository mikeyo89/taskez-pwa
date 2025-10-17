'use client';

import { DEFAULT_ACCENT } from '../appearance';
import { db } from '../db';
import { ProfileSchema, type Profile } from '../models';

export const PROFILE_ID = 'profile';

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'company_name'
    | 'preferred_name'
    | 'preferred_email'
    | 'preferred_phone'
    | 'preferred_color'
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

  if ('preferred_name' in patch) {
    sanitized.preferred_name = patch.preferred_name?.trim() ?? '';
  }

  if ('preferred_email' in patch) {
    const email = patch.preferred_email?.trim() ?? '';
    sanitized.preferred_email = email === '' ? '' : email.toLowerCase();
  }

  if ('preferred_phone' in patch) {
    sanitized.preferred_phone = patch.preferred_phone?.trim() ?? '';
  }

  if (patch.preferred_color) {
    sanitized.preferred_color = patch.preferred_color;
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
        preferred_name: sanitized.preferred_name ?? '',
        preferred_email: sanitized.preferred_email ?? '',
        preferred_phone: sanitized.preferred_phone ?? '',
        preferred_color: sanitized.preferred_color ?? DEFAULT_ACCENT,
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
    preferred_color: sanitized.preferred_color ?? base.preferred_color,
    notifications_enabled: sanitized.notifications_enabled ?? base.notifications_enabled
  });
}

export async function upsertProfile(patch: ProfilePatch): Promise<Profile> {
  const existing = await db.profiles.get(PROFILE_ID);
  const now = nowISO();
  const profile = composeProfile(existing ?? undefined, patch, now);
  await db.profiles.put(profile);
  return profile;
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profiles.get(PROFILE_ID);
}
