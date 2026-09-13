import { db } from '@/lib/db/database';
import { generateId, round } from '@/lib/utils/formatters';
import type { Result, GradeScale } from '@/types/database';

export interface SemesterGpaResult {
  totalCredits: number;
  earnedCredits: number;
  totalGradePoints: number;
  gpa: number;
  results: Result[];
}

export interface CgpaResult {
  totalCredits: number;
  totalGradePoints: number;
  cgpa: number;
  semesterGpas: Array<{
    semesterId: string;
    semesterNumber: number;
    gpa: number;
    credits: number;
  }>;
}

export interface TargetCgpaResult {
  currentCgpa: number;
  completedCredits: number;
  remainingCredits: number;
  targetCgpa: number;
  requiredGpa: number;
  isPossible: boolean;
  message: string;
}

export const gpaService = {
  /**
   * Get all results for a semester.
   */
  async getResultsBySemester(semesterId: string): Promise<Result[]> {
    return db().results.where('semesterId').equals(semesterId).toArray();
  },

  /**
   * Get all results.
   */
  async getAllResults(): Promise<Result[]> {
    return db().results.toArray();
  },

  /**
   * Add or update a result.
   */
  async saveResult(semesterId: string, data: Omit<Result, 'id' | 'semesterId' | 'createdAt' | 'updatedAt'>): Promise<Result> {
    // Check for existing result for this subject+semester
    const existing = await db().results
      .where('[semesterId+subjectId]')
      .equals([semesterId, data.subjectId])
      .first();

    const now = new Date();

    if (existing) {
      await db().results.update(existing.id, { ...data, updatedAt: now });
      return { ...existing, ...data, updatedAt: now };
    }

    const result: Result = {
      ...data,
      id: generateId(),
      semesterId,
      createdAt: now,
      updatedAt: now,
    };
    await db().results.add(result);
    return result;
  },

  /**
   * Delete a result.
   */
  async deleteResult(id: string): Promise<void> {
    await db().results.delete(id);
  },

  /**
   * Calculate semester GPA.
   * GPA = Σ(Credit × GradePoint) / Σ(Credit)
   */
  calculateSemesterGpa(results: Result[]): SemesterGpaResult {
    if (results.length === 0) {
      return { totalCredits: 0, earnedCredits: 0, totalGradePoints: 0, gpa: 0, results };
    }

    let totalCredits = 0;
    let totalGradePoints = 0;
    let earnedCredits = 0;

    for (const r of results) {
      totalCredits += r.credits;
      totalGradePoints += r.credits * r.gradePoint;
      if (r.gradePoint > 0) {
        earnedCredits += r.credits;
      }
    }

    const gpa = totalCredits > 0 ? round(totalGradePoints / totalCredits) : 0;

    return { totalCredits, earnedCredits, totalGradePoints: round(totalGradePoints), gpa, results };
  },

  /**
   * Calculate overall CGPA across all semesters.
   * CGPA = Σ(all Credit × GradePoint) / Σ(all Credit)
   * NOT the average of semester GPAs.
   */
  async calculateCgpa(): Promise<CgpaResult> {
    const allResults = await db().results.toArray();
    const semesters = await db().semesters.toArray();

    let totalCredits = 0;
    let totalGradePoints = 0;

    // Group results by semester
    const bySemester = new Map<string, Result[]>();
    for (const r of allResults) {
      const group = bySemester.get(r.semesterId) || [];
      group.push(r);
      bySemester.set(r.semesterId, group);
    }

    const semesterGpas: CgpaResult['semesterGpas'] = [];

    for (const sem of semesters) {
      const results = bySemester.get(sem.id) || [];
      if (results.length === 0) continue;

      const semGpa = gpaService.calculateSemesterGpa(results);
      totalCredits += semGpa.totalCredits;
      totalGradePoints += semGpa.totalGradePoints;

      semesterGpas.push({
        semesterId: sem.id,
        semesterNumber: sem.number,
        gpa: semGpa.gpa,
        credits: semGpa.totalCredits,
      });
    }

    const cgpa = totalCredits > 0 ? round(totalGradePoints / totalCredits) : 0;

    return { totalCredits, totalGradePoints: round(totalGradePoints), cgpa, semesterGpas };
  },

  /**
   * Calculate target CGPA requirements.
   */
  calculateTargetCgpa(
    currentCgpa: number,
    completedCredits: number,
    remainingCredits: number,
    targetCgpa: number
  ): TargetCgpaResult {
    if (remainingCredits <= 0) {
      return {
        currentCgpa,
        completedCredits,
        remainingCredits,
        targetCgpa,
        requiredGpa: 0,
        isPossible: currentCgpa >= targetCgpa,
        message: currentCgpa >= targetCgpa
          ? `You've already achieved your target CGPA of ${targetCgpa}.`
          : `No remaining credits. Your final CGPA is ${currentCgpa}.`,
      };
    }

    const totalCredits = completedCredits + remainingCredits;
    const currentPoints = currentCgpa * completedCredits;
    const requiredTotalPoints = targetCgpa * totalCredits;
    const requiredRemainingPoints = requiredTotalPoints - currentPoints;
    const requiredGpa = round(requiredRemainingPoints / remainingCredits);

    const isPossible = requiredGpa <= 4.00 && requiredGpa >= 0;

    let message: string;
    if (requiredGpa <= 0) {
      message = `You've already exceeded your target! Any passing grade will keep you above ${targetCgpa}.`;
    } else if (!isPossible) {
      message = `Target CGPA of ${targetCgpa} is not achievable. You would need a GPA of ${requiredGpa}, which exceeds the maximum of 4.00.`;
    } else {
      message = `You need an average GPA of ${requiredGpa} in your remaining ${remainingCredits} credits to achieve a CGPA of ${targetCgpa}.`;
    }

    return {
      currentCgpa,
      completedCredits,
      remainingCredits,
      targetCgpa,
      requiredGpa: Math.max(0, requiredGpa),
      isPossible,
      message,
    };
  },

  /**
   * Get the grade scale.
   */
  async getGradeScale(): Promise<GradeScale[]> {
    return db().gradeScale.orderBy('order').toArray();
  },

  /**
   * Update grade scale.
   */
  async updateGradeScale(grades: Omit<GradeScale, 'id'>[]): Promise<void> {
    await db().transaction('rw', db().gradeScale, async () => {
      await db().gradeScale.clear();
      const items = grades.map((g) => ({ ...g, id: generateId() }));
      await db().gradeScale.bulkAdd(items);
    });
  },

  /**
   * Look up grade point from grade string.
   */
  async getGradePoint(grade: string): Promise<number | undefined> {
    const scale = await db().gradeScale.where('grade').equals(grade).first();
    return scale?.point;
  },
};
