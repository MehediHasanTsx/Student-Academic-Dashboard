import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Profile } from '@/types/database';

const PROFILE_ID = 'student-profile';

export const profileService = {
  /**
   * Get the student profile. Returns null if no profile exists.
   */
  async get(): Promise<Profile | null> {
    const profile = await db.profile.get(PROFILE_ID);
    return profile ?? null;
  },

  /**
   * Check if a profile exists.
   */
  async exists(): Promise<boolean> {
    const profile = await db.profile.get(PROFILE_ID);
    return !!profile;
  },

  /**
   * Create a new profile (first-time setup).
   */
  async create(data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profile> {
    const now = new Date();
    const profile: Profile = {
      ...data,
      id: PROFILE_ID,
      createdAt: now,
      updatedAt: now,
    };
    await db.profile.add(profile);
    return profile;
  },

  /**
   * Update an existing profile.
   */
  async update(data: Partial<Omit<Profile, 'id' | 'createdAt'>>): Promise<void> {
    await db.profile.update(PROFILE_ID, {
      ...data,
      updatedAt: new Date(),
    });
  },

  /**
   * Update the current semester.
   */
  async setCurrentSemester(semester: number): Promise<void> {
    await db.profile.update(PROFILE_ID, {
      currentSemester: semester,
      updatedAt: new Date(),
    });
  },

  /**
   * Update the profile picture (base64 data URL).
   */
  async setProfilePicture(dataUrl: string): Promise<void> {
    await db.profile.update(PROFILE_ID, {
      profilePicture: dataUrl,
      updatedAt: new Date(),
    });
  },

  /**
   * Remove the profile picture.
   */
  async removeProfilePicture(): Promise<void> {
    await db.profile.update(PROFILE_ID, {
      profilePicture: undefined,
      updatedAt: new Date(),
    });
  },
};
