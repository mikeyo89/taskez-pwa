'use client';

import { liveQuery } from 'dexie';
import { useCallback, useEffect, useState } from 'react';

import { upsertProfile, type ProfilePatch, PROFILE_ID } from '../actions/profile';
import { db } from '../db';
import type { Profile } from '../models';

type UseProfileResult = {
  profile: Profile | null;
  loading: boolean;
};

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = liveQuery(() => db.profiles.get(PROFILE_ID)).subscribe({
      next: (value) => {
        setProfile(value ?? null);
        setLoading(false);
      },
      error: (error) => {
        console.error('useProfile liveQuery error', error);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { profile, loading };
}

export function useProfileUpdater() {
  const saveProfile = useCallback(async (patch: ProfilePatch) => upsertProfile(patch), []);
  return { saveProfile };
}
