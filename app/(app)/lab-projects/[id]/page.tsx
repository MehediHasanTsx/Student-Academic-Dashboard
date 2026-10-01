'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProject } from '@/lib/hooks/useProjects';
import { useSemesters, useAllSubjects } from '@/lib/hooks/useSemesters';
import { SUPPORTED_LANGUAGES } from '@/lib/db/schemas';
import { CodeBlock } from '@/app/components/CodeBlock';
import { ProjectActions } from '../components/ProjectActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronRight,
  FileText,
  Info,
  Target,
  BookOpen,
  Wrench,
  Code2,
  Terminal,
  StickyNote,
  Calendar,
  GraduationCap,
  Hash,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function ProjectDetailPage({ params }: PageProps<'/lab-projects/[id]'>) {
  const { id } = use(params);
  const project = useProject(id);
  const semesters = useSemesters();
  const subjects = useAllSubjects();

  if (project === undefined) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="size-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Project not found</p>
        <Link href="/lab-projects" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}>
            <ArrowLeft className="size-3.5" />
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
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in-0 duration-300">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/lab-projects" className="hover:text-foreground transition-colors">
          Lab Projects
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground font-medium truncate max-w-50 sm:max-w-xs">{project.title}</span>
      </nav>

      {/* Title Area */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {project.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{project.labNumber}</p>
          </div>
          <Badge className="self-start text-xs font-medium px-3 py-1">
            {langLabel}
          </Badge>
        </div>

        {/* Academic Info Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {semester && (
            <Badge variant="outline" className="gap-1.5 text-xs font-normal py-1">
              <GraduationCap className="size-3" />
              {semester.name} · Year {Math.ceil(semester.number / 2)}
            </Badge>
          )}
          {subject && (
            <Badge variant="outline" className="gap-1.5 text-xs font-normal py-1">
              <BookOpen className="size-3" />
              {subject.name}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-0.5 font-normal">
                <Hash className="size-2.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <ProjectActions project={project} />

      <Separator />

      {/* Content Sections */}
      <div className="space-y-5">
        {/* Description */}
        <ContentSection
          title="Description"
          icon={<FileText className="size-4" />}
        >
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.description}</p>
        </ContentSection>

        {/* Overview */}
        {project.overview && (
          <ContentSection
            title="Overview"
            icon={<Info className="size-4" />}
          >
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.overview}</p>
          </ContentSection>
        )}

        {/* Objective */}
        {project.objective && (
          <ContentSection
            title="Objective"
            icon={<Target className="size-4" />}
          >
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.objective}</p>
          </ContentSection>
        )}

        {/* Concepts Learned */}
        {project.conceptsLearned && (
          <ContentSection
            title="Concepts Learned"
            icon={<BookOpen className="size-4" />}
          >
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.conceptsLearned}</p>
          </ContentSection>
        )}

        {/* Technologies */}
        {project.technologies.length > 0 && (
          <ContentSection
            title="Technologies & Tools"
            icon={<Wrench className="size-4" />}
          >
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <Badge key={tech} variant="outline" className="text-xs font-normal py-1 px-2.5">
                  {tech}
                </Badge>
              ))}
            </div>
          </ContentSection>
        )}

        {/* Source Code */}
        {project.sourceCode && (
          <div id="source-code-section">
            <ContentSection
              title="Source Code"
              icon={<Code2 className="size-4" />}
            >
              <CodeBlock
                code={project.sourceCode}
                language={project.language}
                fileName={project.fileName}
                maxHeight="600px"
              />
            </ContentSection>
          </div>
        )}

        {/* Output / Result */}
        {project.outputResult && (
          <ContentSection
            title="Output / Result"
            icon={<Terminal className="size-4" />}
          >
            <pre className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
              {project.outputResult}
            </pre>
          </ContentSection>
        )}

        {/* Notes */}
        {project.notes && (
          <ContentSection
            title="Notes"
            icon={<StickyNote className="size-4" />}
          >
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </ContentSection>
        )}
      </div>

      <Separator />

      {/* Timestamps */}
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground pb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3" />
          <span className="font-medium text-foreground">Created:</span>{' '}
          {project.createdAt.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3" />
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
  );
}

function ContentSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
