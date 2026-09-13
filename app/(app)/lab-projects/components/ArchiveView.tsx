'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';
import { useSemesters, useAllSubjects } from '@/lib/hooks/useSemesters';

import { ProjectCard } from './ProjectCard';
import { useState } from 'react';

export function ArchiveView() {
  const semesters = useSemesters();
  const subjects = useAllSubjects();
  const projects = useLiveQuery(() => db().projects.toArray()) ?? [];
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

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

  return (
    <div className="space-y-3 stagger-children">
      {yearGroups.map((yg) => (
        <div key={yg.yearNumber} className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
          {/* Year Header */}
          <button
            onClick={() => toggleYear(yg.yearNumber)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent-subtle/50"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm ${
                yg.totalProjects > 0
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface text-muted'
              }`}>
                {yg.yearNumber}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{yg.yearLabel}</h3>
                <p className="text-[0.7rem] text-muted">
                  {yg.totalProjects} project{yg.totalProjects !== 1 ? 's' : ''} · {yg.subjectGroups.length} subject{yg.subjectGroups.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <svg
              className={`text-muted transition-transform duration-200 ${expandedYears.has(yg.yearNumber) ? 'rotate-180' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Subjects */}
          {expandedYears.has(yg.yearNumber) && yg.subjectGroups.length > 0 && (
            <div className="border-t border-border">
              {yg.subjectGroups.map((sg) => (
                <div key={sg.subject.id}>
                  {/* Subject Header */}
                  <button
                    onClick={() => toggleSubject(sg.subject.id)}
                    className="flex w-full items-center justify-between px-5 py-3 pl-14 text-left transition-colors hover:bg-accent-subtle/30"
                  >
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <span className="text-sm text-foreground">{sg.subject.name}</span>
                      <span className="chip text-[0.6rem] ml-1">{sg.projects.length}</span>
                    </div>
                    <svg
                      className={`text-muted transition-transform duration-200 ${expandedSubjects.has(sg.subject.id) ? 'rotate-180' : ''}`}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Project Cards */}
                  {expandedSubjects.has(sg.subject.id) && (
                    <div className="grid gap-3 px-5 pb-4 pl-14 sm:grid-cols-2 lg:grid-cols-3">
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
              ))}
            </div>
          )}

          {expandedYears.has(yg.yearNumber) && yg.subjectGroups.length === 0 && (
            <div className="border-t border-border px-5 py-6 text-center">
              <p className="text-xs text-muted">No projects in this year yet</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}
