import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Exam } from '@/types/database';

export const examService = {
  async getBySemester(semesterId: string): Promise<Exam[]> {
    return db().exams.where('semesterId').equals(semesterId).toArray();
  },

  async getUpcoming(semesterId: string): Promise<Exam[]> {
    const today = new Date().toISOString().split('T')[0];
    return db().exams
      .where('semesterId')
      .equals(semesterId)
      .filter((e) => e.date >= today)
      .sortBy('date');
  },

  async create(semesterId: string, data: Omit<Exam, 'id' | 'semesterId' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
    const now = new Date();
    const exam: Exam = { ...data, id: generateId(), semesterId, createdAt: now, updatedAt: now };
    await db().exams.add(exam);
    return exam;
  },

  async update(id: string, data: Partial<Omit<Exam, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db().exams.update(id, { ...data, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    await db().exams.delete(id);
  },
};
