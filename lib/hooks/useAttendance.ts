'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { attendanceService, type AttendanceStats, type AttendanceTargetInfo } from '@/lib/services/attendance.service';
import { settingsService } from '@/lib/services/settings.service';
import type { Attendance, AttendanceStatus } from '@/types/database';

export function useAttendance(semesterId: string | undefined) {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceTarget, setAttendanceTarget] = useState(75);

  const load = useCallback(async () => {
    if (!semesterId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      const [data, settings] = await Promise.all([
        attendanceService.getBySemester(semesterId),
        settingsService.get(),
      ]);
      setRecords(data);
      if (settings) setAttendanceTarget(settings.attendanceTarget);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [semesterId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching pattern: loading from IndexedDB
    void load();
  }, [load]);

  const markAttendance = useCallback(async (
    subjectId: string,
    date: string,
    status: AttendanceStatus,
    note?: string
  ) => {
    if (!semesterId) throw new Error('No semester selected');
    await attendanceService.mark(semesterId, subjectId, date, status, note);
    await load();
  }, [semesterId, load]);

  const bulkMark = useCallback(async (
    date: string,
    records: Array<{ subjectId: string; status: AttendanceStatus; note?: string }>
  ) => {
    if (!semesterId) throw new Error('No semester selected');
    await attendanceService.bulkMark(semesterId, date, records);
    await load();
  }, [semesterId, load]);

  const deleteRecord = useCallback(async (id: string) => {
    await attendanceService.delete(id);
    await load();
  }, [load]);

  // Overall stats
  const overallStats = useMemo<AttendanceStats>(
    () => attendanceService.calculateStats(records),
    [records]
  );

  // Per-subject stats
  const subjectStats = useMemo(() => {
    const bySubject = new Map<string, Attendance[]>();
    for (const r of records) {
      const arr = bySubject.get(r.subjectId) || [];
      arr.push(r);
      bySubject.set(r.subjectId, arr);
    }
    const stats = new Map<string, AttendanceStats>();
    for (const [subjectId, subjectRecords] of bySubject) {
      stats.set(subjectId, attendanceService.calculateStats(subjectRecords));
    }
    return stats;
  }, [records]);

  // Target info
  const targetInfo = useMemo<AttendanceTargetInfo>(
    () => attendanceService.calculateTargetInfo(overallStats, attendanceTarget),
    [overallStats, attendanceTarget]
  );

  return {
    records,
    loading,
    overallStats,
    subjectStats,
    targetInfo,
    attendanceTarget,
    markAttendance,
    bulkMark,
    deleteRecord,
    reload: load,
  };
}
