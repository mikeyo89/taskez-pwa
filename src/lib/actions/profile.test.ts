import { describe, expect, it } from 'vitest';

import { DEFAULT_ACCENT } from '@/lib/appearance';

import { composeProfile, PROFILE_ID } from './profile';

describe('composeProfile', () => {
  const now = new Date('2024-01-01T00:00:00.000Z').toISOString();

  it('creates a new profile with sanitized defaults when none exists', () => {
    const profile = composeProfile(
      undefined,
      {
        company_name: '  Taskez  ',
        contact_email: '  TEAM@taskez.com  ',
        contact_phone: '  (555) 123-4567 '
      },
      now
    );

    expect(profile.id).toBe(PROFILE_ID);
    expect(profile.company_name).toBe('Taskez');
    expect(profile.contact_email).toBe('team@taskez.com');
    expect(profile.contact_phone).toBe('(555) 123-4567');
    expect(profile.company_color).toBe(DEFAULT_ACCENT);
    expect(profile.notifications_enabled).toBe(false);
    expect(profile.created_at).toBe(now);
    expect(profile.updated_at).toBe(now);
  });

  it('merges updates with an existing profile while preserving created_at', () => {
    const existingCreated = new Date('2023-11-15T10:00:00.000Z').toISOString();
    const existing = composeProfile(undefined, { company_color: 'emerald' }, existingCreated);

    const updated = composeProfile(
      existing,
      {
        contact_name: '  J. Doe  ',
        contact_email: ''
      },
      now
    );

    expect(updated.contact_name).toBe('J. Doe');
    expect(updated.contact_email).toBe('');
    expect(updated.company_color).toBe('emerald');
    expect(updated.notifications_enabled).toBe(false);
    expect(updated.created_at).toBe(existingCreated);
    expect(updated.updated_at).toBe(now);
  });

  it('updates notification preferences when provided', () => {
    const created = composeProfile(undefined, {}, now);
    const updated = composeProfile(created, { notifications_enabled: true }, now);

    expect(updated.notifications_enabled).toBe(true);
  });

  it('throws when provided email is invalid', () => {
    expect(() =>
      composeProfile(
        undefined,
        {
          contact_email: 'not-an-email'
        },
        now
      )
    ).toThrow();
  });
});
