'use client';

import { useEffect, useState, useCallback } from 'react';
import { profileService } from '@/lib/services/profile.service';
import type { Profile } from '@/types/database';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await profileService.get();
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createProfile = useCallback(async (data: Parameters<typeof profileService.create>[0]) => {
    const p = await profileService.create(data);
    setProfile(p);
    return p;
  }, []);

  const updateProfile = useCallback(async (data: Parameters<typeof profileService.update>[0]) => {
    await profileService.update(data);
    await load();
  }, [load]);

  const setCurrentSemester = useCallback(async (semester: number) => {
    await profileService.setCurrentSemester(semester);
    await load();
  }, [load]);

  return {
    profile,
    loading,
    hasProfile: !!profile,
    createProfile,
    updateProfile,
    setCurrentSemester,
    reload: load,
  };
}
