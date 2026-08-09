'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProject } from '@/lib/hooks/useProjects';
import { ProjectForm } from '../../components/ProjectForm';

export default function EditProjectPage({ params }: PageProps<'/lab-projects/[id]/edit'>) {
  const { id } = use(params);
  const project = useProject(id);

  if (project === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <p className="text-sm text-muted">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted">Project not found</p>
        <Link href="/lab-projects" className="btn btn-secondary !text-xs">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/lab-projects" className="hover:text-accent transition-colors">
          Lab Projects
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <Link href={`/lab-projects/${project.id}`} className="hover:text-accent transition-colors truncate max-w-[200px]">
          {project.title}
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-foreground font-medium">Edit</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
          Edit Project
        </h1>
        <p className="mt-1 text-sm text-muted">
          Editing &ldquo;{project.title}&rdquo;
        </p>
      </div>

      <ProjectForm project={project} mode="edit" />
    </div>
  );
}
