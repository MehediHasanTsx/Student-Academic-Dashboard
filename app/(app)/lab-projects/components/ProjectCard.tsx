'use client';

import Link from 'next/link';
import type { Project, Semester, Subject } from '@/types/database';
import { SUPPORTED_LANGUAGES } from '@/lib/db/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Code2,
  GitFork,
  ExternalLink,
  Calendar,
  BookOpen,
  GraduationCap,
  Hash,
} from 'lucide-react';

/** Color palette keyed by language for the accent strip */
const LANG_COLORS: Record<string, string> = {
  c: 'from-blue-500 to-blue-600',
  cpp: 'from-indigo-500 to-indigo-600',
  java: 'from-orange-500 to-orange-600',
  javascript: 'from-yellow-400 to-yellow-500',
  typescript: 'from-sky-500 to-sky-600',
  python: 'from-emerald-500 to-emerald-600',
  html: 'from-rose-500 to-rose-600',
  css: 'from-violet-500 to-violet-600',
  sql: 'from-cyan-500 to-cyan-600',
};

interface ProjectCardProps {
  project: Project;
  semester?: Semester;
  subject?: Subject;
}

export function ProjectCard({ project, semester, subject }: ProjectCardProps) {
  const langLabel =
    SUPPORTED_LANGUAGES.find((l) => l.value === project.language)?.label || project.language;
  const gradient = LANG_COLORS[project.language] ?? 'from-primary to-primary/80';

  return (
    <Link
      href={`/lab-projects/${project.id}`}
      className="group block no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      id={`project-card-${project.id}`}
    >
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 border-border/60 h-full">
        {/* Language accent strip */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />

        <CardContent className="p-4 pt-5 flex flex-col h-full">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{project.labNumber}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[0.65rem] font-medium">
              {langLabel}
            </Badge>
          </div>

          {/* Description */}
          {project.description && (
            <p className="mb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Academic Info */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {semester && (
              <Badge variant="outline" className="text-[0.65rem] gap-1 font-normal">
                <GraduationCap className="size-3" />
                Year {Math.ceil(semester.number / 2)}
              </Badge>
            )}
            {semester && (
              <Badge variant="outline" className="text-[0.65rem] gap-1 font-normal">
                <Calendar className="size-3" />
                {semester.name}
              </Badge>
            )}
            {subject && (
              <Badge variant="outline" className="text-[0.65rem] gap-1 font-normal">
                <BookOpen className="size-3" />
                {subject.name}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[0.65rem] text-primary/70">
                  <Hash className="size-2.5" />
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[0.65rem] text-muted-foreground">
                  +{project.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1">
            <span className="text-[0.65rem] text-muted-foreground">
              {project.createdAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <div className="flex items-center gap-1.5">
              {project.sourceCode && (
                <div className="flex items-center justify-center size-5 rounded-full bg-success/10">
                  <Code2 className="size-3 text-success" />
                </div>
              )}
              {project.githubUrl && (
                <div className="flex items-center justify-center size-5 rounded-full bg-muted">
                  <GitFork className="size-3 text-muted-foreground" />
                </div>
              )}
              {project.liveDemoUrl && (
                <div className="flex items-center justify-center size-5 rounded-full bg-muted">
                  <ExternalLink className="size-3 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
