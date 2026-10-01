'use client';

import { useSemesters, useAllSubjects } from '@/lib/hooks/useSemesters';
import { SUPPORTED_LANGUAGES } from '@/lib/db/schemas';
import type { SortOption } from '@/lib/hooks/useProjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, SlidersHorizontal } from 'lucide-react';

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
    ? semesters.filter((s) => Math.ceil(s.number / 2) === yearNumber)
    : semesters;

  const filteredSubjects = semesterId
    ? subjects.filter((s) => s.semesterId === semesterId)
    : yearNumber
      ? subjects.filter((s) => {
          const sem = semesters.find((sem) => sem.id === s.semesterId);
          return sem ? Math.ceil(sem.number / 2) === yearNumber : false;
        })
      : subjects;

  const hasActiveFilters = yearNumber || semesterId || subjectId || language;
  const activeCount = [yearNumber, semesterId, subjectId, language].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <SlidersHorizontal className="size-3.5" />
        <span className="font-medium">Filters</span>
        {activeCount > 0 && (
          <Badge variant="secondary" className="text-[0.6rem] h-4 px-1.5 rounded-full">
            {activeCount} active
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Year */}
        <Select
          value={yearNumber?.toString() ?? 'all'}
          onValueChange={(val) => {
            const num = val === 'all' ? undefined : Number(val);
            onYearChange(num);
            onSemesterChange(undefined);
            onSubjectChange(undefined);
          }}
        >
          <SelectTrigger className="w-32.5 h-8 text-xs" id="filter-year">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="1">1st Year</SelectItem>
            <SelectItem value="2">2nd Year</SelectItem>
            <SelectItem value="3">3rd Year</SelectItem>
            <SelectItem value="4">4th Year</SelectItem>
          </SelectContent>
        </Select>

        {/* Semester */}
        <Select
          value={semesterId ?? 'all'}
          onValueChange={(val) => {
            const id = (val === 'all' || !val) ? undefined : val;
            onSemesterChange(id);
            onSubjectChange(undefined);
            if (id) {
              const sem = semesters.find((s) => s.id === id);
              if (sem) onYearChange(Math.ceil(sem.number / 2));
            }
          }}
        >
          <SelectTrigger className="w-40 h-8 text-xs" id="filter-semester">
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {filteredSemesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subject */}
        <Select
          value={subjectId ?? 'all'}
          onValueChange={(val) => onSubjectChange(!val || val === 'all' ? undefined : val)}
        >
          <SelectTrigger className="w-45 h-8 text-xs" id="filter-subject">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {filteredSubjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language */}
        <Select
          value={language ?? 'all'}
          onValueChange={(val) => onLanguageChange(!val || val === 'all' ? undefined : val)}
        >
          <SelectTrigger className="w-37.5 h-8 text-xs" id="filter-language">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {SUPPORTED_LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sort}
          onValueChange={(val) => onSortChange(val as SortOption)}
        >
          <SelectTrigger className="w-40 h-8 text-xs" id="filter-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Added</SelectItem>
            <SelectItem value="updated">Recently Updated</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="semester">By Semester</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onYearChange(undefined);
              onSemesterChange(undefined);
              onSubjectChange(undefined);
              onLanguageChange(undefined);
            }}
            className="h-8 text-xs text-destructive hover:text-destructive gap-1"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
