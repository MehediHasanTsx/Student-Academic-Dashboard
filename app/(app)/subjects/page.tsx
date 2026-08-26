'use client';

import { useState } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subjectSchema, type SubjectFormData } from '@/schemas/subject';
import { SUBJECT_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Subject } from '@/types/database';

export default function SubjectsPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects, loading, createSubject, updateSubject, deleteSubject } = useSubjects(semesterId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [search, setSearch] = useState('');

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSubject(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete subject.');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Semester {profile?.currentSemester} · {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSubject(null);
        }}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>
          <DialogContent className="max-w-md">
            <SubjectForm
              subject={editingSubject}
              onSubmit={async (data) => {
                try {
                  if (editingSubject) {
                    await updateSubject(editingSubject.id, data);
                    toast.success('Subject updated.');
                  } else {
                    await createSubject(data);
                    toast.success('Subject added.');
                  }
                  setDialogOpen(false);
                  setEditingSubject(null);
                } catch {
                  toast.error('Failed to save subject.');
                }
              }}
              onCancel={() => { setDialogOpen(false); setEditingSubject(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {subjects.length > 3 && (
        <Input
          placeholder="Search subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">No subjects yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your courses for Semester {profile?.currentSemester} to get started.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add First Subject
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((subject) => (
            <Card key={subject.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="mt-0.5 h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color || SUBJECT_COLORS[0] }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.code}</p>
                      {subject.teacher && (
                        <p className="text-xs text-muted-foreground mt-1">{subject.teacher}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(subject)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(subject)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">{subject.credits} cr</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{subject.type}</Badge>
                  {subject.room && <Badge variant="outline" className="text-xs">{subject.room}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this subject and all related attendance, results, routine entries, assignments, and exams.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Subject Form ──────────────────────────────────────

function SubjectForm({
  subject,
  onSubmit,
  onCancel,
}: {
  subject: Subject | null;
  onSubmit: (data: SubjectFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      code: subject?.code || '',
      name: subject?.name || '',
      teacher: subject?.teacher || '',
      credits: subject?.credits || 3,
      type: subject?.type || 'theory',
      room: subject?.room || '',
      color: subject?.color || SUBJECT_COLORS[0],
    },
  });

  const onFormSubmit = async (data: SubjectFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <DialogHeader>
        <DialogTitle>{subject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
        <DialogDescription>
          {subject ? 'Update the course details.' : 'Add a new course to this semester.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input id="code" placeholder="CSE305" {...register('code')} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Data Structures" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher">Teacher</Label>
          <Input id="teacher" placeholder="Prof. Name" {...register('teacher')} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="credits">Credits *</Label>
            <Input id="credits" type="number" step="0.5" min="0.5" max="10" {...register('credits', { valueAsNumber: true })} />
            {errors.credits && <p className="text-xs text-destructive">{errors.credits.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={watch('type')} onValueChange={(v) => setValue('type', v as 'theory' | 'lab')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="theory">Theory</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Input id="room" placeholder="301" {...register('room')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`h-6 w-6 rounded-full border-2 transition-all ${
                // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() pattern
                  watch('color') === c ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setValue('color', c)}
              />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : subject ? 'Update' : 'Add Subject'}
        </Button>
      </DialogFooter>
    </form>
  );
}
