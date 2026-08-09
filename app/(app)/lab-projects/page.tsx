'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useProjects, type SortOption } from '@/lib/hooks/useProjects';
import { useSemesterMap, useSubjectMap } from '@/lib/hooks/useSemesters';
import { useProjectCount } from '@/lib/hooks/useProjects';
import { SearchBar } from '@/app/components/SearchBar';
import { EmptyState } from '@/app/components/EmptyState';
import { ProjectCard } from './components/ProjectCard';
import { ArchiveView } from './components/ArchiveView';
import { FilterPanel } from './components/FilterPanel';

type ViewMode = 'archive' | 'list';

export default function LabProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('archive');
  const [search, setSearch] = useState('');
  const [yearNumber, setYearNumber] = useState<number | undefined>();
  const [semesterId, setSemesterId] = useState<string | undefined>();
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [language, setLanguage] = useState<string | undefined>();
  const [sort, setSort] = useState<SortOption>('recent');

  const projects = useProjects({ search, yearNumber, semesterId, subjectId, language, sort });
  const semesterMap = useSemesterMap();
  const subjectMap = useSubjectMap();
  const totalCount = useProjectCount();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                <path d="M8.5 2h7" />
                <path d="M7 16h10" />
              </svg>
            </div>
            Lab Projects
          </h1>
          <p className="mt-1 text-sm text-muted">
            {totalCount} project{totalCount !== 1 ? 's' : ''} in your academic archive
          </p>
        </div>
        <Link href="/lab-projects/new" className="btn btn-primary" id="add-project-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Project
        </Link>
      </div>

      {/* View Toggle + Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <button
              onClick={() => setViewMode('archive')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'archive'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Archive
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Grid
            </button>
          </div>

          {/* Search (only in list view) */}
          {viewMode === 'list' && (
            <div className="flex-1 max-w-md">
              <SearchBar value={search} onChange={handleSearchChange} />
            </div>
          )}
        </div>

        {/* Filters (only in list view) */}
        {viewMode === 'list' && (
          <FilterPanel
            yearNumber={yearNumber}
            semesterId={semesterId}
            subjectId={subjectId}
            language={language}
            sort={sort}
            onYearChange={setYearNumber}
            onSemesterChange={setSemesterId}
            onSubjectChange={setSubjectId}
            onLanguageChange={setLanguage}
            onSortChange={setSort}
          />
        )}
      </div>

      {/* Content */}
      {totalCount === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Start building your academic archive. Add your first lab project to organize your coursework and source code."
          actionLabel="Add Your First Project"
          actionHref="/lab-projects/new"
        />
      ) : viewMode === 'archive' ? (
        <ArchiveView />
      ) : projects.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted">No projects match your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setYearNumber(undefined);
              setSemesterId(undefined);
              setSubjectId(undefined);
              setLanguage(undefined);
            }}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {projects.map((project) => (
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
}
