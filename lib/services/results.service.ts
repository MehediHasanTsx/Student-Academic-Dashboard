import { db } from '@/lib/db/database';
import { generateId, round } from '@/lib/utils/formatters';
import type {
  StudentResultRecord,
  ScholarshipConfig,
  StudentScholarshipStanding,
} from '@/types/database';
import { DEFAULT_SCHOLARSHIP_CONFIG } from '@/lib/constants';

export const resultsService = {
  /**
   * Get all student result records for a given semester.
   */
  async getResultsBySemester(semesterId: string): Promise<StudentResultRecord[]> {
    return db().studentResults.where('semesterId').equals(semesterId).toArray();
  },

  /**
   * Get results for a specific student in a semester.
   */
  async getStudentResults(semesterId: string, studentId: string): Promise<StudentResultRecord[]> {
    return db().studentResults
      .where('semesterId')
      .equals(semesterId)
      .filter((r) => r.studentId === studentId)
      .toArray();
  },

  /**
   * Save or update a student result record.
   */
  async saveResult(
    record: Omit<StudentResultRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<StudentResultRecord> {
    const now = new Date();
    // Look for existing by [semesterId+studentId+subjectCode]
    const existing = await db().studentResults
      .where('semesterId')
      .equals(record.semesterId)
      .filter((r) => r.studentId === record.studentId && r.subjectCode === record.subjectCode)
      .first();

    if (existing) {
      const updated: StudentResultRecord = {
        ...existing,
        ...record,
        id: existing.id,
        updatedAt: now,
      };
      await db().studentResults.put(updated);
      return updated;
    }

    const newRecord: StudentResultRecord = {
      ...record,
      id: record.id || generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await db().studentResults.add(newRecord);
    return newRecord;
  },

  /**
   * Bulk save student result records (useful for admin entry).
   */
  async bulkSaveResults(records: Array<Omit<StudentResultRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>): Promise<void> {
    for (const r of records) {
      await this.saveResult(r);
    }
  },

  /**
   * Delete a student result record.
   */
  async deleteResult(id: string): Promise<void> {
    await db().studentResults.delete(id);
  },

  /**
   * Fetch scholarship configuration.
   */
  async getScholarshipConfig(): Promise<ScholarshipConfig> {
    const config = await db().scholarshipConfig.get(DEFAULT_SCHOLARSHIP_CONFIG.id);
    if (!config) {
      return {
        ...DEFAULT_SCHOLARSHIP_CONFIG,
        updatedAt: new Date(),
      };
    }
    return config;
  },

  /**
   * Update scholarship configuration.
   */
  async updateScholarshipConfig(config: Partial<ScholarshipConfig>): Promise<ScholarshipConfig> {
    const current = await this.getScholarshipConfig();
    const updated: ScholarshipConfig = {
      ...current,
      ...config,
      id: DEFAULT_SCHOLARSHIP_CONFIG.id,
      updatedAt: new Date(),
    };
    await db().scholarshipConfig.put(updated);
    return updated;
  },

  /**
   * Calculate Scholarship Standings for a semester.
   *
   * Rules:
   * 1. Aggregates all student result records for the semester.
   * 2. Groups by student (studentId, studentName, rollNumber).
   * 3. Computes:
   *    - totalInCourseMarks (weighted by inCourseWeight, e.g. 30%)
   *    - totalSemesterFinalMarks (weighted by semesterFinalWeight, e.g. 70%)
   *    - combinedScore = weighted in-course + weighted semester final
   * 4. Ranks students descending by combinedScore.
   * 5. Top N students (default 5) are flagged isEligibleForScholarship = true,
   *    with scholarshipPercentage = 50%.
   */
  async calculateScholarshipStandings(semesterId: string): Promise<StudentScholarshipStanding[]> {
    const [results, config] = await Promise.all([
      this.getResultsBySemester(semesterId),
      this.getScholarshipConfig(),
    ]);

    if (results.length === 0) return [];

    // Group by student
    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      rollNumber: string;
      inCourseTotal: number;
      inCourseMax: number;
      semesterFinalTotal: number;
      semesterFinalMax: number;
    }>();

    for (const r of results) {
      const entry = studentMap.get(r.studentId) || {
        studentId: r.studentId,
        studentName: r.studentName || 'Student',
        rollNumber: r.rollNumber || '',
        inCourseTotal: 0,
        inCourseMax: 0,
        semesterFinalTotal: 0,
        semesterFinalMax: 0,
      };

      if (r.inCourseMarks !== undefined && r.inCourseMarks !== null) {
        entry.inCourseTotal += Number(r.inCourseMarks) || 0;
        entry.inCourseMax += Number(r.inCourseMaxMarks) || 20; // default in-course max 20
      }

      if (r.semesterFinalMarks !== undefined && r.semesterFinalMarks !== null) {
        entry.semesterFinalTotal += Number(r.semesterFinalMarks) || 0;
        entry.semesterFinalMax += Number(r.semesterFinalMaxMarks) || 80; // default final max 80
      }

      studentMap.set(r.studentId, entry);
    }

    const inWeight = config.inCourseWeight / 100;
    const finalWeight = config.semesterFinalWeight / 100;

    const standings: StudentScholarshipStanding[] = [];

    for (const [, st] of studentMap.entries()) {
      // Calculate normalized percentage (0 - 100) for each part
      const inCoursePct = st.inCourseMax > 0 ? (st.inCourseTotal / st.inCourseMax) * 100 : 0;
      const semFinalPct = st.semesterFinalMax > 0 ? (st.semesterFinalTotal / st.semesterFinalMax) * 100 : 0;

      // Combined score: weighted sum
      const combinedScore = round(inCoursePct * inWeight + semFinalPct * finalWeight, 2);

      standings.push({
        studentId: st.studentId,
        studentName: st.studentName,
        rollNumber: st.rollNumber,
        semesterId,
        totalInCourseMarks: round(st.inCourseTotal, 1),
        totalSemesterFinalMarks: round(st.semesterFinalTotal, 1),
        totalCombinedMarks: round(st.inCourseTotal + st.semesterFinalTotal, 1),
        maxPossibleMarks: st.inCourseMax + st.semesterFinalMax,
        percentage: combinedScore,
        combinedScore,
        rank: 0,
        isEligibleForScholarship: false,
        scholarshipPercentage: 0,
      });
    }

    // Sort descending by combinedScore
    standings.sort((a, b) => b.combinedScore - a.combinedScore);

    // Assign rank and scholarship eligibility
    const topCount = config.topStudentsCount || config.topCount || 5;
    const scholarshipPct = config.scholarshipPercentage || config.discountPercent || 50;

    standings.forEach((st, idx) => {
      st.rank = idx + 1;
      if (st.rank <= topCount && st.combinedScore > 0) {
        st.isEligibleForScholarship = true;
        st.scholarshipPercentage = scholarshipPct;
      }
    });

    return standings;
  },
};
