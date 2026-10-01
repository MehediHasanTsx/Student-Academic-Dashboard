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
import { Button, buttonVariants } from '@/components/ui/button';
import {
  FlaskConical,
  Plus,
  FolderTree,
  LayoutGrid,
  Search,
} from 'lucide-react';

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
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <FlaskConical className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Lab Projects
            </h1>
            <p className="text-xs text-muted-foreground">
              {totalCount} project{totalCount !== 1 ? 's' : ''} in your academic archive
            </p>
          </div>
        </div>
        <Link href="/lab-projects/new" id="add-project-btn" className={buttonVariants({ className: "gap-1.5" })}>
            <Plus className="size-4" />
            Add Project
        </Link>
      </div>

      {/* View Toggle + Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setViewMode('archive')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'archive'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <FolderTree className="size-3.5" />
              Archive
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <LayoutGrid className="size-3.5" />
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
        <div className="py-16 text-center space-y-3">
          <Search className="size-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No projects match your filters</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearch('');
              setYearNumber(undefined);
              setSemesterId(undefined);
              setSubjectId(undefined);
              setLanguage(undefined);
            }}
            className="text-xs text-primary"
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
