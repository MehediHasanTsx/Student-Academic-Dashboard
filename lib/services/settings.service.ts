import { db } from '@/lib/db/database';
import type { Settings } from '@/types/database';

const SETTINGS_ID = 'app-settings';

export const settingsService = {
  async get(): Promise<Settings | null> {
    const settings = await db.settings.get(SETTINGS_ID);
    return settings ?? null;
  },

  async update(data: Partial<Omit<Settings, 'id'>>): Promise<void> {
    await db.settings.update(SETTINGS_ID, { ...data, updatedAt: new Date() });
  },

  async resetToDefaults(): Promise<void> {
    const { seedDatabase } = await import('@/lib/db/seed');
    await db.settings.delete(SETTINGS_ID);
    await seedDatabase();
  },
};
