'use client';

import { useEffect, useState, useCallback } from 'react';
import { subjectService } from '@/lib/services/subject.service';
import type { Subject } from '@/types/database';

export function useSubjects(semesterId: string | undefined) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!semesterId) {
      setSubjects([]);
      setLoading(false);
      return;
    }
    try {
      const data = await subjectService.getBySemester(semesterId);
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [semesterId]);

  useEffect(() => { load(); }, [load]);

  const createSubject = useCallback(async (data: Parameters<typeof subjectService.create>[1]) => {
    if (!semesterId) throw new Error('No semester selected');
    const subject = await subjectService.create(semesterId, data);
    await load();
    return subject;
  }, [semesterId, load]);

  const updateSubject = useCallback(async (id: string, data: Parameters<typeof subjectService.update>[1]) => {
    await subjectService.update(id, data);
    await load();
  }, [load]);

  const deleteSubject = useCallback(async (id: string) => {
    await subjectService.delete(id);
    await load();
  }, [load]);

  return {
    subjects,
    loading,
    createSubject,
    updateSubject,
    deleteSubject,
    reload: load,
  };
}
