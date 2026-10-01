'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProject } from '@/lib/hooks/useProjects';
import { ProjectForm } from '../../components/ProjectForm';
import { ChevronRight, Pencil, Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function EditProjectPage({ params }: PageProps<'/lab-projects/[id]/edit'>) {
  const { id } = use(params);
  const project = useProject(id);

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
        <p className="text-sm text-muted-foreground">Project not found</p>
        <Link href="/lab-projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in-0 duration-300">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/lab-projects" className="hover:text-foreground transition-colors">
          Lab Projects
        </Link>
        <ChevronRight className="size-3" />
        <Link href={`/lab-projects/${project.id}`} className="hover:text-foreground transition-colors truncate max-w-30 sm:max-w-50">
          {project.title}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground font-medium">Edit</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Pencil className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Edit Project
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Editing &ldquo;{project.title}&rdquo;
            </p>
          </div>
        </div>
      </div>

      <ProjectForm project={project} mode="edit" />
    </div>
  );
}
