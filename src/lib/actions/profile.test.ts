import { describe, expect, it } from 'vitest';

import { DEFAULT_ACCENT } from '@/lib/appearance';

import { composeProfile, PROFILE_ID } from './profile';

describe('composeProfile', () => {
  const now = new Date('2024-01-01T00:00:00.000Z').toISOString();

  it('creates a new profile with sanitized defaults when none exists', () => {
    const profile = composeProfile(undefined, {
      company_name: '  Taskez  ',
      preferred_email: '  TEAM@taskez.com  ',
      preferred_phone: '  (555) 123-4567 '
    }, now);

    expect(profile.id).toBe(PROFILE_ID);
    expect(profile.company_name).toBe('Taskez');
    expect(profile.preferred_email).toBe('team@taskez.com');
    expect(profile.preferred_phone).toBe('(555) 123-4567');
    expect(profile.preferred_color).toBe(DEFAULT_ACCENT);
    expect(profile.created_at).toBe(now);
    expect(profile.updated_at).toBe(now);
  });

  it('merges updates with an existing profile while preserving created_at', () => {
    const existingCreated = new Date('2023-11-15T10:00:00.000Z').toISOString();
    const existing = composeProfile(undefined, { preferred_color: 'emerald' }, existingCreated);

    const updated = composeProfile(existing, {
      preferred_name: '  J. Doe  ',
      preferred_email: ''
    }, now);

    expect(updated.preferred_name).toBe('J. Doe');
    expect(updated.preferred_email).toBe('');
    expect(updated.preferred_color).toBe('emerald');
    expect(updated.created_at).toBe(existingCreated);
    expect(updated.updated_at).toBe(now);
  });

  it('throws when provided email is invalid', () => {
    expect(() =>
      composeProfile(undefined, {
        preferred_email: 'not-an-email'
      }, now)
    ).toThrow();
  });
});
