'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { db, type Project } from '@/lib/db/db';
import { projectSchema, SUPPORTED_LANGUAGES, type ProjectFormData } from '@/lib/db/schemas';
import { useSemesters, useSubjects } from '@/lib/hooks/useSemesters';

interface ProjectFormProps {
  project?: Project;
  mode: 'create' | 'edit';
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter();
  const semesters = useSemesters();

  const [formData, setFormData] = useState<ProjectFormData>({
    title: project?.title ?? '',
    labNumber: project?.labNumber ?? '',
    semesterId: project?.semesterId ?? '',
    subjectId: project?.subjectId ?? '',
    description: project?.description ?? '',
    language: project?.language ?? '',
    technologies: project?.technologies ?? [],
    tags: project?.tags ?? [],
    sourceCode: project?.sourceCode ?? '',
    fileName: project?.fileName ?? '',
    githubUrl: project?.githubUrl ?? '',
    liveDemoUrl: project?.liveDemoUrl ?? '',
    notes: project?.notes ?? '',
    overview: project?.overview ?? '',
    objective: project?.objective ?? '',
    conceptsLearned: project?.conceptsLearned ?? '',
    outputResult: project?.outputResult ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const subjects = useSubjects(formData.semesterId || undefined);

  const updateField = useCallback(<K extends keyof ProjectFormData>(
    key: K,
    value: ProjectFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const addTech = useCallback(() => {
    const val = techInput.trim();
    if (val && !formData.technologies.includes(val)) {
      updateField('technologies', [...formData.technologies, val]);
    }
    setTechInput('');
  }, [techInput, formData.technologies, updateField]);

  const removeTech = useCallback((tech: string) => {
    updateField('technologies', formData.technologies.filter((t) => t !== tech));
  }, [formData.technologies, updateField]);

  const addTag = useCallback(() => {
    const val = tagInput.trim().toLowerCase();
    if (val && !formData.tags.includes(val)) {
      updateField('tags', [...formData.tags, val]);
    }
    setTagInput('');
  }, [tagInput, formData.tags, updateField]);

  const removeTag = useCallback((tag: string) => {
    updateField('tags', formData.tags.filter((t) => t !== tag));
  }, [formData.tags, updateField]);

  const handleAddSubject = useCallback(async () => {
    if (!newSubjectName.trim() || !formData.semesterId) return;
    const id = uuidv4();
    await db.subjects.add({
      id,
      semesterId: formData.semesterId,
      name: newSubjectName.trim(),
    });
    updateField('subjectId', id);
    setNewSubjectName('');
    setShowAddSubject(false);
  }, [newSubjectName, formData.semesterId, updateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const result = projectSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setSaving(false);
      return;
    }

    try {
      const now = new Date();
      if (mode === 'create') {
        const id = uuidv4();
        await db.projects.add({
          id,
          ...result.data,
          createdAt: now,
          updatedAt: now,
        });
        router.push(`/lab-projects/${id}`);
      } else if (project) {
        await db.projects.update(project.id, {
          ...result.data,
          updatedAt: now,
        });
        router.push(`/lab-projects/${project.id}`);
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      {/* ── Basic Info ──────────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="mb-5 text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Project Information
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label htmlFor="title" className="form-label">
              Project Title <span className="text-danger">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="e.g. Linked List Implementation"
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          {/* Lab Number */}
          <div>
            <label htmlFor="labNumber" className="form-label">
              Lab Number <span className="text-danger">*</span>
            </label>
            <input
              id="labNumber"
              type="text"
              value={formData.labNumber}
              onChange={(e) => updateField('labNumber', e.target.value)}
              className={`form-input ${errors.labNumber ? 'error' : ''}`}
              placeholder="e.g. Lab 03"
            />
            {errors.labNumber && <p className="form-error">{errors.labNumber}</p>}
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="form-label">
              Programming Language <span className="text-danger">*</span>
            </label>
            <select
              id="language"
              value={formData.language}
              onChange={(e) => updateField('language', e.target.value)}
              className={`form-input ${errors.language ? 'error' : ''}`}
            >
              <option value="">Select language</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {errors.language && <p className="form-error">{errors.language}</p>}
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="form-label">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className={`form-input min-h-[80px] resize-y ${errors.description ? 'error' : ''}`}
              placeholder="Describe what this project does…"
              rows={3}
            />
            {errors.description && <p className="form-error">{errors.description}</p>}
          </div>
        </div>
      </section>

      {/* ── Academic Info ───────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="mb-5 text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 6 3 12 0v-5" />
          </svg>
          Academic Details
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Semester */}
          <div>
            <label htmlFor="semesterId" className="form-label">
              Semester <span className="text-danger">*</span>
            </label>
            <select
              id="semesterId"
              value={formData.semesterId}
              onChange={(e) => {
                updateField('semesterId', e.target.value);
                updateField('subjectId', '');
              }}
              className={`form-input ${errors.semesterId ? 'error' : ''}`}
            >
              <option value="">Select semester</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.year})
                </option>
              ))}
            </select>
            {errors.semesterId && <p className="form-error">{errors.semesterId}</p>}
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subjectId" className="form-label">
              Subject <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              <select
                id="subjectId"
                value={formData.subjectId}
                onChange={(e) => updateField('subjectId', e.target.value)}
                className={`form-input ${errors.subjectId ? 'error' : ''}`}
                disabled={!formData.semesterId}
              >
                <option value="">
                  {formData.semesterId ? 'Select subject' : 'Select semester first'}
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {formData.semesterId && (
                <button
                  type="button"
                  onClick={() => setShowAddSubject(!showAddSubject)}
                  className="btn-icon flex-shrink-0 border border-border"
                  title="Add new subject"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
            {errors.subjectId && <p className="form-error">{errors.subjectId}</p>}

            {/* Add Subject Inline */}
            {showAddSubject && formData.semesterId && (
              <div className="mt-2 flex gap-2 animate-fade-in">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="form-input !text-xs"
                  placeholder="Subject name (e.g. Data Structures)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="btn btn-primary !px-3 !py-1.5 !text-xs"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Source Code ─────────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="mb-5 text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          Source Code
        </h2>

        <div className="space-y-4">
          {/* File Name */}
          <div>
            <label htmlFor="fileName" className="form-label">File Name</label>
            <input
              id="fileName"
              type="text"
              value={formData.fileName}
              onChange={(e) => updateField('fileName', e.target.value)}
              className="form-input"
              placeholder="e.g. linked_list.cpp"
            />
          </div>

          {/* Source Code */}
          <div>
            <label htmlFor="sourceCode" className="form-label">Source Code</label>
            <textarea
              id="sourceCode"
              value={formData.sourceCode}
              onChange={(e) => updateField('sourceCode', e.target.value)}
              className="form-input min-h-[200px] resize-y font-mono text-xs leading-relaxed"
              placeholder="Paste your source code here…"
              rows={12}
              spellCheck={false}
            />
          </div>
        </div>
      </section>

      {/* ── Technologies & Tags ─────────────────────── */}
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="mb-5 text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          Technologies & Tags
        </h2>

        <div className="space-y-5">
          {/* Technologies */}
          <div>
            <label className="form-label">Technologies / Tools</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                className="form-input"
                placeholder="e.g. GCC, Visual Studio, Make"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTech();
                  }
                }}
              />
              <button
                type="button"
                onClick={addTech}
                className="btn btn-secondary !px-3 !text-xs"
              >
                Add
              </button>
            </div>
            {formData.technologies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {formData.technologies.map((tech) => (
                  <span key={tech} className="chip group">
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-0.5 text-muted hover:text-danger transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="form-input"
                placeholder="e.g. algorithms, linked-list, pointer"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addTag}
                className="btn btn-secondary !px-3 !text-xs"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {formData.tags.map((tag) => (
                  <span key={tag} className="chip-accent chip group">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 text-accent hover:text-danger transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── URLs ────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="mb-5 text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          External Links
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="githubUrl" className="form-label">GitHub Repository URL</label>
            <input
              id="githubUrl"
              type="url"
              value={formData.githubUrl}
              onChange={(e) => updateField('githubUrl', e.target.value)}
              className={`form-input ${errors.githubUrl ? 'error' : ''}`}
              placeholder="https://github.com/username/project"
            />
            {errors.githubUrl && <p className="form-error">{errors.githubUrl}</p>}
          </div>
          <div>
            <label htmlFor="liveDemoUrl" className="form-label">Live Demo URL</label>
            <input
              id="liveDemoUrl"
              type="url"
              value={formData.liveDemoUrl}
              onChange={(e) => updateField('liveDemoUrl', e.target.value)}
              className={`form-input ${errors.liveDemoUrl ? 'error' : ''}`}
              placeholder="https://example.com/demo"
            />
            {errors.liveDemoUrl && <p className="form-error">{errors.liveDemoUrl}</p>}
          </div>
        </div>
      </section>

      {/* ── Documentation ──────────────────────────── */}
      <section className="rounded-xl border border-border bg-surface-elevated p-6">
        <h2 className="mb-5 text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Documentation
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="overview" className="form-label">Overview</label>
            <textarea
              id="overview"
              value={formData.overview}
              onChange={(e) => updateField('overview', e.target.value)}
              className="form-input min-h-[60px] resize-y"
              placeholder="Brief overview of this project…"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="objective" className="form-label">Objective</label>
            <textarea
              id="objective"
              value={formData.objective}
              onChange={(e) => updateField('objective', e.target.value)}
              className="form-input min-h-[60px] resize-y"
              placeholder="What is the objective of this lab/project?"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="conceptsLearned" className="form-label">Concepts Learned</label>
            <textarea
              id="conceptsLearned"
              value={formData.conceptsLearned}
              onChange={(e) => updateField('conceptsLearned', e.target.value)}
              className="form-input min-h-[60px] resize-y"
              placeholder="Key concepts learned from this project…"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="outputResult" className="form-label">Output / Result</label>
            <textarea
              id="outputResult"
              value={formData.outputResult}
              onChange={(e) => updateField('outputResult', e.target.value)}
              className="form-input min-h-[60px] resize-y"
              placeholder="Expected output or result…"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="notes" className="form-label">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="form-input min-h-[60px] resize-y"
              placeholder="Additional notes, observations, or reminders…"
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex items-center justify-between pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <>
              <div
                className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                style={{ animation: 'spin 0.8s linear infinite' }}
              />
              Saving…
            </>
          ) : mode === 'create' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Project
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
