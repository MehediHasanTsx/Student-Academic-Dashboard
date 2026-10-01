'use client';

import Link from 'next/link';
import { ProjectForm } from '../components/ProjectForm';
import { ChevronRight, Plus } from 'lucide-react';

export default function NewProjectPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in-0 duration-300">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/lab-projects" className="hover:text-foreground transition-colors">
          Lab Projects
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground font-medium">New Project</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Plus className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Add New Project
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add a lab experiment, coursework, or learning project to your archive.
            </p>
          </div>
        </div>
      </div>

      <ProjectForm mode="create" />
    </div>
  );
}
