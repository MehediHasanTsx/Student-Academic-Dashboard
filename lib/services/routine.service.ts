import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { RoutineSlot, DayOfWeek } from '@/types/database';

export const routineService = {
  async getBySemester(semesterId: string): Promise<RoutineSlot[]> {
    return db.routine.where('semesterId').equals(semesterId).toArray();
  },

  async getByDay(semesterId: string, day: DayOfWeek): Promise<RoutineSlot[]> {
    return db.routine
      .where('[semesterId+dayOfWeek]')
      .equals([semesterId, day])
      .sortBy('startTime');
  },

  async create(semesterId: string, data: Omit<RoutineSlot, 'id' | 'semesterId' | 'createdAt'>): Promise<RoutineSlot> {
    const slot: RoutineSlot = { ...data, id: generateId(), semesterId, createdAt: new Date() };
    await db.routine.add(slot);
    return slot;
  },

  async update(id: string, data: Partial<Omit<RoutineSlot, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db.routine.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.routine.delete(id);
  },
};
