import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Assignment } from '@/types/database';

export const assignmentService = {
  async getBySemester(semesterId: string): Promise<Assignment[]> {
    return db.assignments.where('semesterId').equals(semesterId).toArray();
  },

  async getUpcoming(semesterId: string): Promise<Assignment[]> {
    const now = new Date().toISOString();
    return db.assignments
      .where('semesterId')
      .equals(semesterId)
      .filter((a) => a.status === 'pending' && a.deadline >= now)
      .sortBy('deadline');
  },

  async create(semesterId: string, data: Omit<Assignment, 'id' | 'semesterId' | 'createdAt' | 'updatedAt'>): Promise<Assignment> {
    const now = new Date();
    const assignment: Assignment = { ...data, id: generateId(), semesterId, createdAt: now, updatedAt: now };
    await db.assignments.add(assignment);
    return assignment;
  },

  async update(id: string, data: Partial<Omit<Assignment, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db.assignments.update(id, { ...data, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    await db.assignments.delete(id);
  },
};
