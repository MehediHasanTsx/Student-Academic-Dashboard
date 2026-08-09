'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { examService } from '@/lib/services/exam.service';
import { formatDate } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { examSchema, type ExamFormData } from '@/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GraduationCap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Exam } from '@/types/database';

export default function ExamsPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);
  const [exams, setExams] = useState<Exam[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);

  const loadData = async () => {
    if (!semesterId) return;
    const data = await examService.getBySemester(semesterId);
    setExams(data.sort((a, b) => a.date.localeCompare(b.date)));
  };

  useEffect(() => { loadData(); }, [semesterId]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = exams.filter((e) => e.date >= today);
  const past = exams.filter((e) => e.date < today);

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
          <p className="text-sm text-muted-foreground">Semester {profile.currentSemester} · {upcoming.length} upcoming</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Exam</Button>
          <DialogContent>
            <ExamForm subjects={subjects} onSubmit={async (data) => {
              if (!semesterId) return;
              await examService.create(semesterId, data);
              toast.success('Exam added.');
              setDialogOpen(false);
              await loadData();
            }} onCancel={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Upcoming</h2>
          {upcoming.map((e) => {
            const subject = subjects.find((s) => s.id === e.subjectId);
            const daysLeft = Math.ceil((new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <Card key={e.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{subject?.name} · {formatDate(e.date)}{e.time ? ` · ${e.time}` : ''}{e.room ? ` · Room ${e.room}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={daysLeft <= 3 ? 'destructive' : daysLeft <= 7 ? 'secondary' : 'outline'} className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Completed</h2>
          {past.map((e) => {
            const subject = subjects.find((s) => s.id === e.subjectId);
            return (
              <Card key={e.id} className="opacity-60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{subject?.name} · {formatDate(e.date)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {exams.length === 0 && (
        <Card><CardContent className="py-12 text-center"><GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">No exams scheduled.</p></CardContent></Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete exam?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (deleteTarget) { await examService.delete(deleteTarget.id); toast.success('Deleted.'); setDeleteTarget(null); await loadData(); }}} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExamForm({ subjects, onSubmit, onCancel }: { subjects: { id: string; name: string }[]; onSubmit: (data: ExamFormData) => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: '', subjectId: '', date: '', time: '', room: '', notes: '' },
  });
  const doSubmit = async (data: ExamFormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader><DialogTitle>Add Exam</DialogTitle><DialogDescription>Schedule an upcoming exam.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Exam Name *</Label><Input placeholder="e.g. Mid-term" {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
        <div className="space-y-2"><Label>Subject *</Label><Select value={watch('subjectId')} onValueChange={(v) => { if (v) setValue('subjectId', v); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Date *</Label><Input type="date" {...register('date')} />{errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}</div>
          <div className="space-y-2"><Label>Time</Label><Input type="time" {...register('time')} /></div>
        </div>
        <div className="space-y-2"><Label>Room</Label><Input placeholder="Room number" {...register('room')} /></div>
        <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Optional notes" {...register('notes')} /></div>
      </div>
      <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Exam'}</Button></DialogFooter>
    </form>
  );
}
