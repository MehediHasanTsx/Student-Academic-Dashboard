'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProject } from '@/lib/hooks/useProjects';
import { useSemesters, useAllSubjects } from '@/lib/hooks/useSemesters';
import { SUPPORTED_LANGUAGES } from '@/lib/db/schemas';
import { CodeBlock } from '@/app/components/CodeBlock';
import { ProjectActions } from '../components/ProjectActions';

export default function ProjectDetailPage({ params }: PageProps<'/lab-projects/[id]'>) {
  const { id } = use(params);
  const project = useProject(id);
  const semesters = useSemesters();
  const subjects = useAllSubjects();

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

  const semester = semesters.find((s) => s.id === project.semesterId);
  const subject = subjects.find((s) => s.id === project.subjectId);
  const langLabel =
    SUPPORTED_LANGUAGES.find((l) => l.value === project.language)?.label || project.language;

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
        <span className="text-foreground font-medium truncate max-w-xs">{project.title}</span>
      </nav>

      {/* Title Area */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {project.title}
            </h1>
            <p className="mt-1 text-sm text-muted">{project.labNumber}</p>
          </div>
          <span className="chip-accent chip self-start text-xs">{langLabel}</span>
        </div>

        {/* Academic Info Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {semester && (
            <span className="chip text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {semester.name} · {semester.year}
            </span>
          )}
          {subject && (
            <span className="chip text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              {subject.name}
            </span>
          )}
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span key={tag} className="chip-accent chip text-[0.7rem]">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-8">
        <ProjectActions project={project} />
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Description */}
        <Section title="Description" icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        }>
          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{project.description}</p>
        </Section>

        {/* Overview */}
        {project.overview && (
          <Section title="Overview" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{project.overview}</p>
          </Section>
        )}

        {/* Objective */}
        {project.objective && (
          <Section title="Objective" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{project.objective}</p>
          </Section>
        )}

        {/* Concepts Learned */}
        {project.conceptsLearned && (
          <Section title="Concepts Learned" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          }>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{project.conceptsLearned}</p>
          </Section>
        )}

        {/* Technologies */}
        {project.technologies.length > 0 && (
          <Section title="Technologies & Tools" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          }>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span key={tech} className="chip text-xs">{tech}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Source Code */}
        {project.sourceCode && (
          <div id="source-code-section">
            <Section title="Source Code" icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            }>
              <CodeBlock
                code={project.sourceCode}
                language={project.language}
                fileName={project.fileName}
                maxHeight="600px"
              />
            </Section>
          </div>
        )}

        {/* Output / Result */}
        {project.outputResult && (
          <Section title="Output / Result" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          }>
            <pre className="rounded-lg border border-border bg-code-bg p-4 text-xs text-muted font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
              {project.outputResult}
            </pre>
          </Section>
        )}

        {/* Notes */}
        {project.notes && (
          <Section title="Notes" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          }>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </Section>
        )}

        {/* Timestamps */}
        <div className="flex flex-wrap gap-6 border-t border-border pt-6 text-xs text-muted">
          <div>
            <span className="font-medium text-foreground">Created:</span>{' '}
            {project.createdAt.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div>
            <span className="font-medium text-foreground">Updated:</span>{' '}
            {project.updatedAt.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground tracking-wide uppercase">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
