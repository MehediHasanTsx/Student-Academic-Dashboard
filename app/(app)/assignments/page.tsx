'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { assignmentService } from '@/lib/services/assignment.service';
import { formatDate } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { assignmentSchema, type AssignmentFormData } from '@/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ClipboardList, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Assignment, AssignmentStatus, AssignmentPriority } from '@/types/database';

export default function AssignmentsPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const loadData = async () => {
    if (!semesterId) return;
    const data = await assignmentService.getBySemester(semesterId);
    setAssignments(data.sort((a, b) => a.deadline.localeCompare(b.deadline)));
  };

  useEffect(() => { loadData(); }, [semesterId]);

  const filtered = assignments.filter((a) => filter === 'all' || a.status === filter);

  const toggleStatus = async (a: Assignment) => {
    const newStatus: AssignmentStatus = a.status === 'completed' ? 'pending' : 'completed';
    await assignmentService.update(a.id, { status: newStatus });
    toast.success(newStatus === 'completed' ? 'Marked complete!' : 'Marked pending.');
    await loadData();
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-sm text-muted-foreground">Semester {profile.currentSemester} · {assignments.filter(a => a.status === 'pending').length} pending</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Assignment</Button>
          <DialogContent>
            <AssignmentForm subjects={subjects} onSubmit={async (data) => {
              if (!semesterId) return;
              await assignmentService.create(semesterId, data);
              toast.success('Assignment added.');
              setDialogOpen(false);
              await loadData();
            }} onCancel={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="capitalize text-xs">{f}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No assignments {filter !== 'all' ? `(${filter})` : ''}.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const subject = subjects.find((s) => s.id === a.subjectId);
            const isOverdue = a.status === 'pending' && new Date(a.deadline) < new Date();
            return (
              <Card key={a.id} className={a.status === 'completed' ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Checkbox checked={a.status === 'completed'} onCheckedChange={() => toggleStatus(a)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${a.status === 'completed' ? 'line-through' : ''}`}>{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{subject?.name}</p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{formatDate(a.deadline)}</p>
                    </div>
                  </div>
                  <Badge variant={a.priority === 'high' ? 'destructive' : a.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs capitalize">{a.priority}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete assignment?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (deleteTarget) { await assignmentService.delete(deleteTarget.id); toast.success('Deleted.'); setDeleteTarget(null); await loadData(); }}} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AssignmentForm({ subjects, onSubmit, onCancel }: { subjects: { id: string; name: string }[]; onSubmit: (data: AssignmentFormData) => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { title: '', subjectId: '', deadline: '', priority: 'medium', status: 'pending', description: '' },
  });
  const doSubmit = async (data: AssignmentFormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader><DialogTitle>Add Assignment</DialogTitle><DialogDescription>Add a new assignment to track.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Title *</Label><Input placeholder="Assignment title" {...register('title')} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
        <div className="space-y-2"><Label>Subject *</Label><Select value={watch('subjectId')} onValueChange={(v) => { if (v) setValue('subjectId', v); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>{errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Deadline *</Label><Input type="datetime-local" {...register('deadline')} />{errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}</div>
          <div className="space-y-2"><Label>Priority</Label><Select value={watch('priority')} onValueChange={(v) => { if (v) setValue('priority', v as AssignmentPriority); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
        </div>
        <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Optional description" {...register('description')} /></div>
      </div>
      <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add'}</Button></DialogFooter>
    </form>
  );
}
