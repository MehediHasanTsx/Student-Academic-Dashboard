'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';
import { useSemesters, useAllSubjects } from '@/lib/hooks/useSemesters';
import { ProjectCard } from './ProjectCard';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  FolderOpen,
  Folder,
  FlaskConical,
} from 'lucide-react';

export function ArchiveView() {
  const semesters = useSemesters();
  const subjects = useAllSubjects();
  const projects = useLiveQuery(() => db().projects.toArray()) ?? [];


  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(() => {
    // Auto-expand subjects that have projects for a nicer default experience
    const set = new Set<string>();
    for (const project of projects) {
      set.add(project.subjectId);
    }
    return set;
  });

  const semesterMap = new Map(semesters.map((s) => [s.id, s]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Group projects by year → subject
  const yearGroups = [1, 2, 3, 4].map((yearNum) => {
    const yearSemesters = semesters.filter((s) => Math.ceil(s.number / 2) === yearNum);
    const yearSemesterIds = new Set(yearSemesters.map((s) => s.id));
    const yearSubjects = subjects.filter((s) => yearSemesterIds.has(s.semesterId));

    const subjectGroups = yearSubjects.map((subject) => {
      const subjectProjects = projects.filter((p) => p.subjectId === subject.id);
      return { subject, projects: subjectProjects };
    });

    // Filter out subjects with no projects
    const activeSubjectGroups = subjectGroups.filter((sg) => sg.projects.length > 0);
    const totalProjects = activeSubjectGroups.reduce((sum, sg) => sum + sg.projects.length, 0);

    return {
      yearNumber: yearNum,
      yearLabel: `${yearNum}${getOrdinalSuffix(yearNum)} Year`,
      semesters: yearSemesters,
      subjectGroups: activeSubjectGroups,
      totalProjects,
    };
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  const hasAnyProjects = yearGroups.some((yg) => yg.totalProjects > 0);

  if (!hasAnyProjects) {
    return null;
  }

  /** Year-specific accent colors for left border + icon bg */
  const yearAccents = [
    'border-l-blue-500 bg-blue-500',
    'border-l-emerald-500 bg-emerald-500',
    'border-l-amber-500 bg-amber-500',
    'border-l-violet-500 bg-violet-500',
  ];

  return (
    <div className="space-y-4">
      {yearGroups.map((yg, idx) => {
        const isExpanded = expandedYears.has(yg.yearNumber);
        const accentClasses = yearAccents[idx] ?? yearAccents[0];
        const [borderClass, bgClass] = accentClasses.split(' ');

        return (
          <div
            key={yg.yearNumber}
            className={`rounded-xl border border-border/60 overflow-hidden transition-all duration-200 ${
              isExpanded ? 'shadow-sm' : ''
            } ${yg.totalProjects > 0 ? `border-l-[3px] ${borderClass}` : ''}`}
          >
            {/* Year Header */}
            <button
              onClick={() => toggleYear(yg.yearNumber)}
              className="flex w-full items-center justify-between px-4 md:px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-white text-sm font-bold ${
                  yg.totalProjects > 0
                    ? bgClass
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {yg.yearNumber}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{yg.yearLabel}</h3>
                  <p className="text-xs text-muted-foreground">
                    {yg.totalProjects} project{yg.totalProjects !== 1 ? 's' : ''} · {yg.subjectGroups.length} subject{yg.subjectGroups.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Subjects */}
            {isExpanded && yg.subjectGroups.length > 0 && (
              <div className="border-t border-border/50">
                {yg.subjectGroups.map((sg) => {
                  const isSubjectExpanded = expandedSubjects.has(sg.subject.id);
                  return (
                    <div key={sg.subject.id} className="border-b border-border/30 last:border-b-0">
                      {/* Subject Header */}
                      <button
                        onClick={() => toggleSubject(sg.subject.id)}
                        className="flex w-full items-center justify-between px-4 md:px-5 py-3 pl-8 md:pl-12 text-left transition-colors hover:bg-accent/30"
                      >
                        <div className="flex items-center gap-2.5">
                          {isSubjectExpanded ? (
                            <FolderOpen className="size-4 text-primary" />
                          ) : (
                            <Folder className="size-4 text-muted-foreground" />
                          )}
                          <span className="text-sm text-foreground font-medium">{sg.subject.name}</span>
                          <Badge variant="secondary" className="text-[0.6rem] h-5 px-1.5">
                            {sg.projects.length}
                          </Badge>
                        </div>
                        <ChevronDown
                          className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isSubjectExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Project Cards */}
                      {isSubjectExpanded && (
                        <div className="grid gap-3 px-4 md:px-5 pb-4 pl-8 md:pl-12 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                          {sg.projects
                            .sort((a, b) => a.labNumber.localeCompare(b.labNumber))
                            .map((project) => (
                              <ProjectCard
                                key={project.id}
                                project={project}
                                semester={semesterMap.get(project.semesterId)}
                                subject={subjectMap.get(project.subjectId)}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isExpanded && yg.subjectGroups.length === 0 && (
              <div className="border-t border-border/50 px-5 py-8 text-center">
                <FlaskConical className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No projects in this year yet</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  const mod10 = n % 10;
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}
