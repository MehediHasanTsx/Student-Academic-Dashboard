'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db, type Project } from '@/lib/db/db';
import { Modal } from '@/app/components/Modal';

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
      await db.projects.delete(project.id);
      router.push('/lab-projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      setDeleting(false);
    }
  }, [project.id, router]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* View Code (scroll to code) */}
        {project.sourceCode && (
          <button
            onClick={() => {
              document.getElementById('source-code-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn btn-secondary !text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            View Code
          </button>
        )}

        {/* Copy Code */}
        {project.sourceCode && (
          <button onClick={handleCopyCode} className="btn btn-secondary !text-xs">
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Code
              </>
            )}
          </button>
        )}

        {/* Download Code */}
        {project.sourceCode && (
          <button onClick={handleDownloadCode} className="btn btn-secondary !text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        )}

        {/* GitHub */}
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        )}

        {/* Live Demo */}
        {project.liveDemoUrl && (
          <a
            href={project.liveDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary !text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Live Demo
          </a>
        )}

        <div className="flex-1" />

        {/* Edit */}
        <button
          onClick={() => router.push(`/lab-projects/${project.id}/edit`)}
          className="btn btn-secondary !text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit
        </button>

        {/* Delete */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-danger !text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project"
        actions={
          <>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn btn-secondary !text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-danger !text-sm"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>&ldquo;{project.title}&rdquo;</strong>?
          This action cannot be undone. All source code and notes will be permanently removed.
        </p>
      </Modal>
    </>
  );
}
