'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db/database';
import type { Project } from '@/types/database';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Code2,
  Copy,
  Check,
  Download,
  GitFork,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';

interface ProjectActionsProps {
  project: Project;
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    if (!project.sourceCode) return;
    await navigator.clipboard.writeText(project.sourceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [project.sourceCode]);

  const handleDownloadCode = useCallback(() => {
    if (!project.sourceCode) return;
    const extMap: Record<string, string> = {
      c: 'c', cpp: 'cpp', java: 'java', javascript: 'js',
      typescript: 'ts', python: 'py', html: 'html', css: 'css', sql: 'sql',
    };
    const ext = extMap[project.language] || 'txt';
    const name = project.fileName || `${project.title.toLowerCase().replace(/\s+/g, '_')}.${ext}`;
    const blob = new Blob([project.sourceCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await db().projects.delete(project.id);
      router.push('/lab-projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      setDeleting(false);
    }
  }, [project.id, router]);

  return (
    <>
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Code actions */}
        {project.sourceCode && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                document.getElementById('source-code-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-7 gap-1.5 text-xs"
            >
              <Code2 className="size-3.5" />
              <span className="hidden sm:inline">View Code</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-success" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadCode}
              className="h-7 gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        )}

        {/* External links */}
        {(project.githubUrl || project.liveDemoUrl) && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card p-1">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-7 gap-1.5 text-xs' })}
              >
                <GitFork className="size-3.5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            )}
            {project.liveDemoUrl && (
              <a
                href={project.liveDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-7 gap-1.5 text-xs' })}
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Live Demo</span>
              </a>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Edit & Delete */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/lab-projects/${project.id}/edit`)}
            className="h-8 gap-1.5 text-xs"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{project.title}&rdquo;?
              This action cannot be undone. All source code and notes will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
