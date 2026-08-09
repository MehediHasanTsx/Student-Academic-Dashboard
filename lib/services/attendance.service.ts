import { db } from '@/lib/db/database';
import { generateId, calcPercentage, round } from '@/lib/utils/formatters';
import { CONDUCTED_STATUSES, ATTENDED_STATUSES } from '@/lib/constants';
import type { Attendance, AttendanceStatus } from '@/types/database';

export interface AttendanceStats {
  totalConducted: number;
  attended: number;
  absent: number;
  late: number;
  medical: number;
  holiday: number;
  noClass: number;
  percentage: number;
}

export interface AttendanceTargetInfo {
  currentPercentage: number;
  target: number;
  isAboveTarget: boolean;
  classesCanMiss: number;
  classesNeededToReachTarget: number;
  message: string;
}

export const attendanceService = {
  /**
   * Get all attendance records for a semester.
   */
  async getBySemester(semesterId: string): Promise<Attendance[]> {
    return db.attendance.where('semesterId').equals(semesterId).toArray();
  },

  /**
   * Get attendance for a specific subject.
   */
  async getBySubject(subjectId: string): Promise<Attendance[]> {
    return db.attendance.where('subjectId').equals(subjectId).toArray();
  },

  /**
   * Get attendance for a specific date in a semester.
   */
  async getByDate(semesterId: string, date: string): Promise<Attendance[]> {
    return db.attendance.where('[semesterId+date]').equals([semesterId, date]).toArray();
  },

  /**
   * Get attendance for a date range.
   */
  async getByDateRange(semesterId: string, startDate: string, endDate: string): Promise<Attendance[]> {
    return db.attendance
      .where('[semesterId+date]')
      .between([semesterId, startDate], [semesterId, endDate], true, true)
      .toArray();
  },

  /**
   * Mark attendance for a single subject on a date.
   */
  async mark(
    semesterId: string,
    subjectId: string,
    date: string,
    status: AttendanceStatus,
    note?: string
  ): Promise<Attendance> {
    // Check if a record already exists for this subject+date
    const existing = await db.attendance
      .where('[subjectId+date]')
      .equals([subjectId, date])
      .first();

    if (existing) {
      await db.attendance.update(existing.id, { status, note });
      return { ...existing, status, note };
    }

    const record: Attendance = {
      id: generateId(),
      subjectId,
      semesterId,
      date,
      status,
      note,
      createdAt: new Date(),
    };
    await db.attendance.add(record);
    return record;
  },

  /**
   * Bulk mark attendance for multiple subjects on a date.
   */
  async bulkMark(
    semesterId: string,
    date: string,
    records: Array<{ subjectId: string; status: AttendanceStatus; note?: string }>
  ): Promise<void> {
    await db.transaction('rw', db.attendance, async () => {
      for (const rec of records) {
        await attendanceService.mark(semesterId, rec.subjectId, date, rec.status, rec.note);
      }
    });
  },

  /**
   * Delete an attendance record.
   */
  async delete(id: string): Promise<void> {
    await db.attendance.delete(id);
  },

  /**
   * Calculate attendance statistics for a subject.
   */
  calculateStats(records: Attendance[]): AttendanceStats {
    const counts: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      medical: 0,
      holiday: 0,
      noClass: 0,
    };

    for (const r of records) {
      counts[r.status]++;
    }

    const totalConducted = CONDUCTED_STATUSES.reduce((sum, s) => sum + counts[s], 0);
    const attended = ATTENDED_STATUSES.reduce((sum, s) => sum + counts[s], 0);

    return {
      totalConducted,
      attended,
      absent: counts.absent,
      late: counts.late,
      medical: counts.medical,
      holiday: counts.holiday,
      noClass: counts.noClass,
      percentage: round(calcPercentage(attended, totalConducted)),
    };
  },

  /**
   * Calculate how many classes are needed/can be missed to reach/maintain target.
   */
  calculateTargetInfo(stats: AttendanceStats, targetPercent: number): AttendanceTargetInfo {
    const { totalConducted, attended, percentage } = stats;
    const isAboveTarget = percentage >= targetPercent;

    let classesCanMiss = 0;
    let classesNeededToReachTarget = 0;
    let message = '';

    if (totalConducted === 0) {
      message = 'No classes conducted yet.';
    } else if (isAboveTarget) {
      // How many future classes can be missed while staying at/above target?
      // (attended) / (totalConducted + x) >= target/100
      // attended * 100 >= target * (totalConducted + x)
      // x <= (attended * 100 - target * totalConducted) / target
      classesCanMiss = Math.floor(
        (attended * 100 - targetPercent * totalConducted) / targetPercent
      );
      classesCanMiss = Math.max(0, classesCanMiss);
      message = classesCanMiss > 0
        ? `You can miss ${classesCanMiss} more class${classesCanMiss > 1 ? 'es' : ''} and stay above ${targetPercent}%.`
        : `You're at the target. Don't miss any more classes.`;
    } else {
      // How many consecutive classes must be attended to reach target?
      // (attended + x) / (totalConducted + x) >= target/100
      // 100*(attended + x) >= target*(totalConducted + x)
      // 100*attended + 100*x >= target*totalConducted + target*x
      // x*(100 - target) >= target*totalConducted - 100*attended
      // x >= (target*totalConducted - 100*attended) / (100 - target)
      if (targetPercent >= 100) {
        classesNeededToReachTarget = Infinity;
        message = `A target of ${targetPercent}% is impossible to reach.`;
      } else {
        classesNeededToReachTarget = Math.ceil(
          (targetPercent * totalConducted - 100 * attended) / (100 - targetPercent)
        );
        classesNeededToReachTarget = Math.max(0, classesNeededToReachTarget);
        message = `You need to attend the next ${classesNeededToReachTarget} class${classesNeededToReachTarget > 1 ? 'es' : ''} to reach ${targetPercent}%.`;
      }
    }

    return {
      currentPercentage: percentage,
      target: targetPercent,
      isAboveTarget,
      classesCanMiss,
      classesNeededToReachTarget,
      message,
    };
  },
};
