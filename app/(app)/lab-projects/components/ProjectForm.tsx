'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import type { Project } from '@/types/database';
import { projectSchema, SUPPORTED_LANGUAGES, type ProjectFormData } from '@/lib/db/schemas';
import { useSemesters } from '@/lib/hooks/useSemesters';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Info,
  GraduationCap,
  Code2,
  Tag,
  Link as LinkIcon,
  FileText,
  Plus,
  X,
  Loader2,
  Check,
  Hash,
} from 'lucide-react';

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

  const { subjects } = useSubjects(formData.semesterId || undefined);

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
    const now = new Date();
    await db().subjects.add({
      id,
      semesterId: formData.semesterId,
      name: newSubjectName.trim(),
      code: newSubjectName.trim().slice(0, 6).toUpperCase(),
      credits: 3,
      type: 'lab',
      createdAt: now,
      updatedAt: now,
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
        await db().projects.add({
          id,
          ...result.data,
          createdAt: now,
          updatedAt: now,
        });
        router.push(`/lab-projects/${id}`);
      } else if (project) {
        await db().projects.update(project.id, {
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 animate-in fade-in-0 duration-300">
      {/* ── Basic Info ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4 text-primary" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">
                Project Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                className={errors.title ? 'border-destructive' : ''}
                placeholder="e.g. Linked List Implementation"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            {/* Lab Number */}
            <div className="space-y-1.5">
              <Label htmlFor="labNumber">
                Lab Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="labNumber"
                value={formData.labNumber}
                onChange={(e) => updateField('labNumber', e.target.value)}
                className={errors.labNumber ? 'border-destructive' : ''}
                placeholder="e.g. Lab 03"
              />
              {errors.labNumber && <p className="text-xs text-destructive">{errors.labNumber}</p>}
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label htmlFor="language">
                Programming Language <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.language || undefined}
                onValueChange={(val) => updateField('language', val ?? '')}
              >
                <SelectTrigger id="language" className={errors.language ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.language && <p className="text-xs text-destructive">{errors.language}</p>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className={`min-h-20 resize-y ${errors.description ? 'border-destructive' : ''}`}
                placeholder="Describe what this project does…"
                rows={3}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Academic Info ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="size-4 text-primary" />
            Academic Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Semester */}
            <div className="space-y-1.5">
              <Label htmlFor="semesterId">
                Semester <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.semesterId || undefined}
                onValueChange={(val) => {
                  updateField('semesterId', val ?? '');
                  updateField('subjectId', '');
                }}
              >
                <SelectTrigger id="semesterId" className={errors.semesterId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (Year {Math.ceil(s.number / 2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.semesterId && <p className="text-xs text-destructive">{errors.semesterId}</p>}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="subjectId">
                Subject <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.subjectId || undefined}
                  onValueChange={(val) => updateField('subjectId', val ?? '')}
                  disabled={!formData.semesterId}
                >
                  <SelectTrigger id="subjectId" className={errors.subjectId ? 'border-destructive' : ''}>
                    <SelectValue placeholder={formData.semesterId ? 'Select subject' : 'Select semester first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.semesterId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddSubject(!showAddSubject)}
                    title="Add new subject"
                    className="shrink-0"
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>
              {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId}</p>}

              {/* Add Subject Inline */}
              {showAddSubject && formData.semesterId && (
                <div className="flex gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="text-xs"
                    placeholder="Subject name (e.g. Data Structures)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSubject}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Source Code ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Code2 className="size-4 text-primary" />
            Source Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={formData.fileName}
              onChange={(e) => updateField('fileName', e.target.value)}
              placeholder="e.g. linked_list.cpp"
            />
          </div>

          {/* Source Code */}
          <div className="space-y-1.5">
            <Label htmlFor="sourceCode">Source Code</Label>
            <Textarea
              id="sourceCode"
              value={formData.sourceCode}
              onChange={(e) => updateField('sourceCode', e.target.value)}
              className="min-h-50 resize-y font-mono text-xs leading-relaxed"
              placeholder="Paste your source code here…"
              rows={12}
              spellCheck={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Technologies & Tags ─────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="size-4 text-primary" />
            Technologies & Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Technologies */}
          <div className="space-y-2">
            <Label>Technologies / Tools</Label>
            <div className="flex gap-2">
              <Input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                placeholder="e.g. GCC, Visual Studio, Make"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTech();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addTech}
                className="shrink-0"
              >
                Add
              </Button>
            </div>
            {formData.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.technologies.map((tech) => (
                  <Badge key={tech} variant="secondary" className="gap-1 pr-1">
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="ml-0.5 hover:text-destructive transition-colors rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. algorithms, linked-list, pointer"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addTag}
                className="shrink-0"
              >
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-0.5 pr-1">
                    <Hash className="size-2.5" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:text-destructive transition-colors rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── URLs ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <LinkIcon className="size-4 text-primary" />
            External Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="githubUrl">GitHub Repository URL</Label>
              <Input
                id="githubUrl"
                type="url"
                value={formData.githubUrl}
                onChange={(e) => updateField('githubUrl', e.target.value)}
                className={errors.githubUrl ? 'border-destructive' : ''}
                placeholder="https://github.com/username/project"
              />
              {errors.githubUrl && <p className="text-xs text-destructive">{errors.githubUrl}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="liveDemoUrl">Live Demo URL</Label>
              <Input
                id="liveDemoUrl"
                type="url"
                value={formData.liveDemoUrl}
                onChange={(e) => updateField('liveDemoUrl', e.target.value)}
                className={errors.liveDemoUrl ? 'border-destructive' : ''}
                placeholder="https://example.com/demo"
              />
              {errors.liveDemoUrl && <p className="text-xs text-destructive">{errors.liveDemoUrl}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Documentation ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" />
            Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="overview">Overview</Label>
            <Textarea
              id="overview"
              value={formData.overview}
              onChange={(e) => updateField('overview', e.target.value)}
              className="min-h-15 resize-y"
              placeholder="Brief overview of this project…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objective">Objective</Label>
            <Textarea
              id="objective"
              value={formData.objective}
              onChange={(e) => updateField('objective', e.target.value)}
              className="min-h-15 resize-y"
              placeholder="What is the objective of this lab/project?"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conceptsLearned">Concepts Learned</Label>
            <Textarea
              id="conceptsLearned"
              value={formData.conceptsLearned}
              onChange={(e) => updateField('conceptsLearned', e.target.value)}
              className="min-h-15 resize-y"
              placeholder="Key concepts learned from this project…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outputResult">Output / Result</Label>
            <Textarea
              id="outputResult"
              value={formData.outputResult}
              onChange={(e) => updateField('outputResult', e.target.value)}
              className="min-h-15 resize-y"
              placeholder="Expected output or result…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="min-h-15 resize-y"
              placeholder="Additional notes, observations, or reminders…"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex items-center justify-between pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="gap-1.5"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : mode === 'create' ? (
            <>
              <Plus className="size-4" />
              Create Project
            </>
          ) : (
            <>
              <Check className="size-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
