'use client';

import { useSemesters, useAllSubjects } from '@/lib/hooks/useSemesters';
import { SUPPORTED_LANGUAGES } from '@/lib/db/schemas';
import type { SortOption } from '@/lib/hooks/useProjects';

interface FilterPanelProps {
  yearNumber?: number;
  semesterId?: string;
  subjectId?: string;
  language?: string;
  sort: SortOption;
  onYearChange: (year?: number) => void;
  onSemesterChange: (id?: string) => void;
  onSubjectChange: (id?: string) => void;
  onLanguageChange: (lang?: string) => void;
  onSortChange: (sort: SortOption) => void;
}

export function FilterPanel({
  yearNumber,
  semesterId,
  subjectId,
  language,
  sort,
  onYearChange,
  onSemesterChange,
  onSubjectChange,
  onLanguageChange,
  onSortChange,
}: FilterPanelProps) {
  const semesters = useSemesters();
  const subjects = useAllSubjects();

  const filteredSemesters = yearNumber
    ? semesters.filter((s) => s.yearNumber === yearNumber)
    : semesters;

  const filteredSubjects = semesterId
    ? subjects.filter((s) => s.semesterId === semesterId)
    : yearNumber
      ? subjects.filter((s) => {
          const sem = semesters.find((sem) => sem.id === s.semesterId);
          return sem?.yearNumber === yearNumber;
        })
      : subjects;

  const hasActiveFilters = yearNumber || semesterId || subjectId || language;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Year */}
        <select
          value={yearNumber ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : undefined;
            onYearChange(val);
            onSemesterChange(undefined);
            onSubjectChange(undefined);
          }}
          className="form-input !w-auto !py-2 !text-xs"
          id="filter-year"
        >
          <option value="">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        {/* Semester */}
        <select
          value={semesterId ?? ''}
          onChange={(e) => {
            const val = e.target.value || undefined;
            onSemesterChange(val);
            onSubjectChange(undefined);
            // Auto-set year from semester
            if (val) {
              const sem = semesters.find((s) => s.id === val);
              if (sem) onYearChange(sem.yearNumber);
            }
          }}
          className="form-input !w-auto !py-2 !text-xs"
          id="filter-semester"
        >
          <option value="">All Semesters</option>
          {filteredSemesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Subject */}
        <select
          value={subjectId ?? ''}
          onChange={(e) => onSubjectChange(e.target.value || undefined)}
          className="form-input !w-auto !py-2 !text-xs"
          id="filter-subject"
        >
          <option value="">All Subjects</option>
          {filteredSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Language */}
        <select
          value={language ?? ''}
          onChange={(e) => onLanguageChange(e.target.value || undefined)}
          className="form-input !w-auto !py-2 !text-xs"
          id="filter-language"
        >
          <option value="">All Languages</option>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="form-input !w-auto !py-2 !text-xs"
          id="filter-sort"
        >
          <option value="recent">Recently Added</option>
          <option value="updated">Recently Updated</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="semester">By Semester</option>
        </select>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              onYearChange(undefined);
              onSemesterChange(undefined);
              onSubjectChange(undefined);
              onLanguageChange(undefined);
            }}
            className="btn-ghost !text-xs text-danger"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
