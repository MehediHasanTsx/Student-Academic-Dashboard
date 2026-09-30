import { db } from '@/lib/db/database';
import type { MainData, Subject, RoutineSlot, Exam, ExamRoutineItem, ScholarshipConfig, StudentResultRecord } from '@/types/database';
import { generateId } from '@/lib/utils/formatters';

export const mainDataService = {
  /**
   * Fetch authoritative main data for a semester from the backend.
   */
  async fetchMainData(semesterId = 'semester-5'): Promise<MainData> {
    const res = await fetch(`/api/main-data?semesterId=${encodeURIComponent(semesterId)}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch main data (status: ${res.status})`);
    }
    const json = await res.json();
    return json.data as MainData;
  },

  /**
   * Publish updated main data to the server (Admin only).
   */
  async publishMainData(
    semesterId: string,
    payload: {
      subjects: Subject[];
      routine: RoutineSlot[];
      exams?: Exam[];
      examRoutines?: ExamRoutineItem[];
      scholarshipConfig?: ScholarshipConfig;
      scholarshipResults?: StudentResultRecord[];
    }
  ): Promise<{ updatedAt: string }> {
    const res = await fetch('/api/main-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        semesterId,
        subjects: payload.subjects,
        routine: payload.routine,
        exams: payload.exams || [],
        examRoutines: payload.examRoutines,
        scholarshipConfig: payload.scholarshipConfig,
        scholarshipResults: payload.scholarshipResults,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to publish main data');
    }

    return { updatedAt: json.updatedAt };
  },

  /**
   * Sync a student's subjects with the Main Subjects.
   *
   * Rules:
   * 1. Preserves existing student subjects and their IDs to NEVER destroy attendance or results.
   * 2. Matches by stable ID or by course code.
   * 3. Updates name, code, teacher, credits, type, room, color, and order.
   * 4. Adds any newly introduced Main subjects.
   * 5. NEVER deletes subjects.
   */
  async syncSubjectsWithMain(semesterId = 'semester-5'): Promise<{ added: number; updated: number }> {
    const main = await this.fetchMainData(semesterId);
    if (!main || !Array.isArray(main.subjects)) {
      throw new Error('No main subjects available to sync.');
    }

    const localSubjects = await db().subjects.where('semesterId').equals(semesterId).toArray();
    const localById = new Map(localSubjects.map((s) => [s.id, s]));
    const localByCode = new Map(localSubjects.map((s) => [s.code.trim().toLowerCase(), s]));

    let added = 0;
    let updated = 0;
    const now = new Date();

    await db().transaction('rw', db().subjects, async () => {
      for (const mainSub of main.subjects) {
        // Try matching by stable ID first, then by code
        const matched = localById.get(mainSub.id) || localByCode.get(mainSub.code.trim().toLowerCase());

        if (matched) {
          // Update details while keeping student's stable ID
          await db().subjects.update(matched.id, {
            name: mainSub.name,
            code: mainSub.code,
            credits: mainSub.credits,
            type: mainSub.type,
            color: mainSub.color,
            teacher: mainSub.teacher,
            room: mainSub.room,
            order: mainSub.order ?? matched.order,
            updatedAt: now,
          });
          updated++;
        } else {
          // Add new main subject with its stable ID
          await db().subjects.add({
            ...mainSub,
            id: mainSub.id || generateId(),
            semesterId,
            createdAt: now,
            updatedAt: now,
          });
          added++;
        }
      }
    });

    return { added, updated };
  },

  /**
   * Sync a student's routine with Main Routine.
   *
   * Rules:
   * 1. Replaces the student's personal routine for this semester with the Main Routine.
   * 2. Re-maps subject IDs so slots correctly link to the student's local subjects.
   * 3. Attendance, notes, exams, and personal subjects are completely untouched!
   */
  async syncRoutineWithMain(semesterId = 'semester-5'): Promise<{ slotCount: number }> {
    const main = await this.fetchMainData(semesterId);
    if (!main || !Array.isArray(main.routine)) {
      throw new Error('No main routine available to sync.');
    }

    // Ensure we have local subjects to link to
    const localSubjects = await db().subjects.where('semesterId').equals(semesterId).toArray();
    const localById = new Map(localSubjects.map((s) => [s.id, s]));
    const localByCode = new Map(localSubjects.map((s) => [s.code.trim().toLowerCase(), s]));

    // Map main subjectId/code to local subject IDs
    const now = new Date();
    const slotsToInsert: RoutineSlot[] = [];

    for (const r of main.routine) {
      // Find matching subject
      let targetSubjectId = r.subjectId;
      if (!localById.has(targetSubjectId)) {
        // If main subject ID isn't directly in local, try matching through main subject codes
        const mainSub = main.subjects.find((s) => s.id === r.subjectId);
        if (mainSub) {
          const localSub = localByCode.get(mainSub.code.trim().toLowerCase());
          if (localSub) {
            targetSubjectId = localSub.id;
          }
        }
      }

      slotsToInsert.push({
        id: generateId(),
        semesterId,
        subjectId: targetSubjectId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        room: r.room,
        teacher: r.teacher,
        createdAt: now,
      });
    }

    // Replace current routine with the official Main Routine
    await db().transaction('rw', db().routine, async () => {
      await db().routine.where('semesterId').equals(semesterId).delete();
      if (slotsToInsert.length > 0) {
        await db().routine.bulkAdd(slotsToInsert);
      }
    });

    return { slotCount: slotsToInsert.length };
  },

  /**
   * Sync student's exams with Main Exams.
   * Adds or updates official exams without removing any custom exams added by the student.
   */
  async syncExamsWithMain(semesterId = 'semester-5'): Promise<{ examCount: number }> {
    const main = await this.fetchMainData(semesterId);
    if (!main || !Array.isArray(main.exams) || main.exams.length === 0) {
      return { examCount: 0 };
    }

    const localExams = await db().exams.where('semesterId').equals(semesterId).toArray();
    const localById = new Map(localExams.map((e) => [e.id, e]));

    // Local subjects map
    const localSubjects = await db().subjects.where('semesterId').equals(semesterId).toArray();
    const localByIdSub = new Map(localSubjects.map((s) => [s.id, s]));
    const localByCodeSub = new Map(localSubjects.map((s) => [s.code.trim().toLowerCase(), s]));

    const now = new Date();
    let count = 0;

    await db().transaction('rw', db().exams, async () => {
      for (const mainExam of main.exams) {
        let targetSubjectId = mainExam.subjectId;
        if (!localByIdSub.has(targetSubjectId)) {
          const mainSub = main.subjects.find((s) => s.id === mainExam.subjectId);
          if (mainSub) {
            const localSub = localByCodeSub.get(mainSub.code.trim().toLowerCase());
            if (localSub) {
              targetSubjectId = localSub.id;
            }
          }
        }

        const existing = localById.get(mainExam.id);
        if (existing) {
          await db().exams.update(existing.id, {
            name: mainExam.name,
            subjectId: targetSubjectId,
            date: mainExam.date,
            time: mainExam.time,
            room: mainExam.room,
            notes: mainExam.notes,
            updatedAt: now,
          });
        } else {
          await db().exams.add({
            ...mainExam,
            id: mainExam.id || generateId(),
            semesterId,
            subjectId: targetSubjectId,
            createdAt: now,
            updatedAt: now,
          });
        }
        count++;
      }
    });

    return { examCount: count };
  },

  /**
   * Sync exam routines with Main Data.
   */
  async syncExamRoutinesWithMain(semesterId = 'semester-5'): Promise<{ count: number }> {
    const main = await this.fetchMainData(semesterId);
    if (!main || !main.examRoutines || !Array.isArray(main.examRoutines) || main.examRoutines.length === 0) {
      return { count: 0 };
    }

    const routines = main.examRoutines;
    const now = new Date();
    let count = 0;

    await db().transaction('rw', db().examRoutines, async () => {
      for (const item of routines) {
        await db().examRoutines.put({
          ...item,
          semesterId,
          updatedAt: now,
        });
        count++;
      }
    });

    return { count };
  },
};
