'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { routineService } from '@/lib/services/routine.service';
import { DAYS_OF_WEEK, DAY_LABELS } from '@/lib/constants';
import { formatTime, getCurrentDay } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { routineSlotSchema, type RoutineSlotFormData } from '@/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { RoutineSlot, DayOfWeek } from '@/types/database';

export default function RoutinePage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoutineSlot | null>(null);
  const today = getCurrentDay();

  const loadData = async () => {
    if (!semesterId) return;
    const data = await routineService.getBySemester(semesterId);
    setRoutine(data);
  };

  useEffect(() => { loadData(); }, [semesterId]);

  const getSlotsByDay = (day: DayOfWeek) =>
    routine.filter((r) => r.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await routineService.delete(deleteTarget.id);
    toast.success('Class removed.');
    setDeleteTarget(null);
    await loadData();
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Routine</h1>
          <p className="text-sm text-muted-foreground">Semester {profile.currentSemester} · Weekly schedule</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Class</Button>
          <DialogContent>
            <RoutineForm
              subjects={subjects}
              onSubmit={async (data) => {
                if (!semesterId) return;
                await routineService.create(semesterId, data);
                toast.success('Class added.');
                setDialogOpen(false);
                await loadData();
              }}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const slots = getSlotsByDay(day);
          const isToday = day === today;
          return (
            <Card key={day} className={isToday ? 'border-primary/30' : ''}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{DAY_LABELS[day]}</CardTitle>
                  {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
                  <Badge variant="outline" className="text-xs ml-auto">{slots.length} class{slots.length !== 1 ? 'es' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const subject = subjects.find((s) => s.id === slot.subjectId);
                      return (
                        <div key={slot.id} className="flex items-center gap-3 rounded-md border border-border p-2.5 group">
                          <div className="text-xs text-muted-foreground min-w-[90px] font-mono">
                            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{subject?.name || 'Unknown'}</p>
                            {slot.room && <p className="text-xs text-muted-foreground">Room: {slot.room}</p>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteTarget(slot)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove this class?</AlertDialogTitle><AlertDialogDescription>This will remove the class from the routine.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoutineForm({ subjects, onSubmit, onCancel }: { subjects: { id: string; name: string }[]; onSubmit: (data: RoutineSlotFormData) => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RoutineSlotFormData>({
    resolver: zodResolver(routineSlotSchema),
    defaultValues: { subjectId: '', dayOfWeek: 'sunday', startTime: '09:00', endTime: '10:00', room: '' },
  });
  const doSubmit = async (data: RoutineSlotFormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader><DialogTitle>Add Class</DialogTitle><DialogDescription>Add a class to the weekly routine.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Subject</Label><Select value={watch('subjectId')} onValueChange={(v) => { if (v) setValue('subjectId', v); }}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>{errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}</div>
        <div className="space-y-2"><Label>Day</Label><Select value={watch('dayOfWeek')} onValueChange={(v) => { if (v) setValue('dayOfWeek', v as DayOfWeek); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Start Time</Label><Input type="time" {...register('startTime')} /></div>
          <div className="space-y-2"><Label>End Time</Label><Input type="time" {...register('endTime')} /></div>
        </div>
        <div className="space-y-2"><Label>Room</Label><Input placeholder="e.g. 301" {...register('room')} /></div>
      </div>
      <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Class'}</Button></DialogFooter>
    </form>
  );
}
