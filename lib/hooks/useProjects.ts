'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';


export type SortOption = 'recent' | 'updated' | 'alphabetical' | 'semester';

interface UseProjectsOptions {
  search?: string;
  yearNumber?: number;
  semesterId?: string;
  subjectId?: string;
  language?: string;
  tag?: string;
  sort?: SortOption;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { search, yearNumber, semesterId, subjectId, language, tag, sort = 'recent' } = options;

  const projects = useLiveQuery(
    async () => {
      let collection = db().projects.toCollection();

      // Apply indexed filters
      if (subjectId) {
        collection = db().projects.where('subjectId').equals(subjectId);
      } else if (semesterId) {
        collection = db().projects.where('semesterId').equals(semesterId);
      } else if (language) {
        collection = db().projects.where('language').equals(language);
      }

      let results = await collection.toArray();

      // Filter by year (needs semester lookup)
      if (yearNumber) {
        const sems = await db().semesters.toArray();
        const semesterIds = sems
          .filter((s) => Math.ceil(s.number / 2) === yearNumber)
          .map((s) => s.id);
        results = results.filter((p) => semesterIds.includes(p.semesterId));
      }

      // Filter by language if not already applied via index
      if (language && !(!subjectId && !semesterId)) {
        results = results.filter((p) => p.language === language);
      }

      // Filter by tag
      if (tag) {
        results = results.filter((p) =>
          p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        );
      }

      // Search
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        results = results.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q)) ||
            p.labNumber.toLowerCase().includes(q)
        );
      }

      // Sort
      switch (sort) {
        case 'recent':
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'updated':
          results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          break;
        case 'alphabetical':
          results.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'semester':
          const sems = await db().semesters.toArray();
          const semOrder = new Map(sems.map((s) => [s.id, s.number]));
          results.sort(
            (a, b) => (semOrder.get(a.semesterId) ?? 0) - (semOrder.get(b.semesterId) ?? 0)
          );
          break;
      }

      return results;
    },
    [search, yearNumber, semesterId, subjectId, language, tag, sort]
  );

  return projects ?? [];
}

export function useProject(id: string) {
  const project = useLiveQuery(() => {
    if (!id) return undefined;
    return db().projects.get(id);
  }, [id]);
  return project;
}

export function useProjectCount() {
  const count = useLiveQuery(() => db().projects.count());
  return count ?? 0;
}
