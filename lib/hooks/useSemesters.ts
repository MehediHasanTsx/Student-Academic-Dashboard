'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Semester, type Subject } from '@/lib/db/db';

export function useSemesters() {
  const semesters = useLiveQuery(() =>
    db.semesters.orderBy('semesterNumber').toArray()
  );
  return semesters ?? [];
}

export function useSubjects(semesterId?: string) {
  const subjects = useLiveQuery(
    () => {
      if (semesterId) {
        return db.subjects.where('semesterId').equals(semesterId).toArray();
      }
      return db.subjects.toArray();
    },
    [semesterId]
  );
  return subjects ?? [];
}

export function useAllSubjects() {
  const subjects = useLiveQuery(() => db.subjects.toArray());
  return subjects ?? [];
}

export function useSemesterMap() {
  const semesters = useSemesters();
  const map = new Map<string, Semester>();
  for (const s of semesters) {
    map.set(s.id, s);
  }
  return map;
}

export function useSubjectMap() {
  const subjects = useAllSubjects();
  const map = new Map<string, Subject>();
  for (const s of subjects) {
    map.set(s.id, s);
  }
  return map;
}
