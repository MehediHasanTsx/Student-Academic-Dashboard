import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { ExamRoutineItem, ExamType, SeatPlanRange } from '@/types/database';
import { DEFAULT_5TH_SEMESTER_EXAM_ROUTINE } from '@/lib/constants';

export const examRoutineService = {
  /**
   * Get exam routines, optionally filtered by semester and exam type.
   */
  async getExamRoutines(semesterId?: string, examType?: ExamType): Promise<ExamRoutineItem[]> {
    const collection = db().examRoutines.toCollection();

    if (semesterId && examType) {
      return db().examRoutines.where({ semesterId, examType }).sortBy('date');
    } else if (semesterId) {
      return db().examRoutines.where('semesterId').equals(semesterId).sortBy('date');
    } else if (examType) {
      return db().examRoutines.where('examType').equals(examType).sortBy('date');
    }

    return collection.sortBy('date');
  },

  /**
   * Get single routine item by ID.
   */
  async getExamRoutineById(id: string): Promise<ExamRoutineItem | undefined> {
    return db().examRoutines.get(id);
  },

  /**
   * Add or update an exam routine item.
   */
  async saveExamRoutine(item: Omit<ExamRoutineItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ExamRoutineItem> {
    const now = new Date();
    const id = item.id || generateId();

    const record: ExamRoutineItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db().examRoutines.put(record);
    return record;
  },

  /**
   * Delete an exam routine item.
   */
  async deleteExamRoutine(id: string): Promise<void> {
    await db().examRoutines.delete(id);
  },

  /**
   * Restores official default routines (e.g. from server Main Data or local constants fallback).
   */
  async resetToOfficialRoutine(semesterId = 'semester-5'): Promise<number> {
    try {
      const res = await fetch(`/api/main-data?semesterId=${encodeURIComponent(semesterId)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const serverRoutines: ExamRoutineItem[] = json?.data?.examRoutines;
        if (Array.isArray(serverRoutines) && serverRoutines.length > 0) {
          await db().examRoutines.where('semesterId').equals(semesterId).delete();
          const now = new Date();
          for (const item of serverRoutines) {
            await db().examRoutines.put({
              ...item,
              semesterId,
              createdAt: now,
              updatedAt: now,
            });
          }
          return serverRoutines.length;
        }
      }
    } catch (err) {
      console.warn('Could not sync exam routines from server, falling back to local defaults', err);
    }

    if (semesterId === 'semester-5') {
      await db().examRoutines.where('semesterId').equals('semester-5').delete();
      const now = new Date();
      for (const item of DEFAULT_5TH_SEMESTER_EXAM_ROUTINE) {
        await db().examRoutines.put({
          ...item,
          createdAt: now,
          updatedAt: now,
        });
      }
      return DEFAULT_5TH_SEMESTER_EXAM_ROUTINE.length;
    }
    return 0;
  },

  /**
   * Find matching room and roll range for a given student's roll number.
   * Handles ranges like "2-60", "64-126", "127-193", "5, 12, 18-25".
   */
  findStudentSeat(rollInput: string | number, seatPlan?: SeatPlanRange[]): SeatPlanRange | null {
    if (!seatPlan || seatPlan.length === 0) return null;
    const cleanRoll = typeof rollInput === 'number' ? rollInput : parseInt(String(rollInput).replace(/\D/g, ''), 10);
    if (isNaN(cleanRoll)) return null;

    for (const plan of seatPlan) {
      if (!plan.rollRange) continue;
      // Ranges might be formatted as "2-60", "64-126", "127 - 193", or comma-separated
      const parts = plan.rollRange.split(',').map((p) => p.trim());
      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map((s) => s.trim());
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end) && cleanRoll >= start && cleanRoll <= end) {
            return plan;
          }
        } else {
          const singleRoll = parseInt(part, 10);
          if (!isNaN(singleRoll) && singleRoll === cleanRoll) {
            return plan;
          }
        }
      }
    }

    return null;
  },
};
