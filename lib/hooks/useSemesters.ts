'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';
import type { Semester, Subject } from '@/types/database';

export function useSemesters() {
  const semesters = useLiveQuery(() =>
    db().semesters.orderBy('number').toArray()
  );
  return semesters ?? [];
}

export function useAllSubjects() {
  const subjects = useLiveQuery(() => db().subjects.toArray());
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
