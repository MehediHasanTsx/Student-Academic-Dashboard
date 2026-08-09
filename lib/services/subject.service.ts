import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Subject } from '@/types/database';

export const subjectService = {
  /**
   * Get all subjects for a semester.
   */
  async getBySemester(semesterId: string): Promise<Subject[]> {
    return db.subjects.where('semesterId').equals(semesterId).toArray();
  },

  /**
   * Get a single subject by ID.
   */
  async getById(id: string): Promise<Subject | undefined> {
    return db.subjects.get(id);
  },

  /**
   * Get all subjects across all semesters.
   */
  async getAll(): Promise<Subject[]> {
    return db.subjects.toArray();
  },

  /**
   * Create a new subject.
   */
  async create(semesterId: string, data: Omit<Subject, 'id' | 'semesterId' | 'createdAt' | 'updatedAt'>): Promise<Subject> {
    const now = new Date();
    const subject: Subject = {
      ...data,
      id: generateId(),
      semesterId,
      createdAt: now,
      updatedAt: now,
    };
    await db.subjects.add(subject);
    return subject;
  },

  /**
   * Update a subject.
   */
  async update(id: string, data: Partial<Omit<Subject, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db.subjects.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  },

  /**
   * Delete a subject and all related records.
   */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.subjects, db.attendance, db.results, db.routine, db.assignments, db.exams, db.notes], async () => {
      await db.attendance.where('subjectId').equals(id).delete();
      await db.results.where('subjectId').equals(id).delete();
      await db.routine.where('subjectId').equals(id).delete();
      await db.assignments.where('subjectId').equals(id).delete();
      await db.exams.where('subjectId').equals(id).delete();
      // Unlink notes (don't delete, just remove subject reference)
      await db.notes.where('subjectId').equals(id).modify({ subjectId: undefined });
      await db.subjects.delete(id);
    });
  },

  /**
   * Count subjects in a semester.
   */
  async countBySemester(semesterId: string): Promise<number> {
    return db.subjects.where('semesterId').equals(semesterId).count();
  },
};
