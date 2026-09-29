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

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { seed5thSemesterRoutine } from '@/lib/db/seed';
import type { RoutineSlot, DayOfWeek } from '@/types/database';

export default function RoutinePage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>('sunday');
  const [deleteTarget, setDeleteTarget] = useState<RoutineSlot | null>(null);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const today = getCurrentDay();

  const loadData = async () => {
    if (!semesterId) return;
    const data = await routineService.getBySemester(semesterId);
    setRoutine(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching from IndexedDB
    void loadData();
  }, [semesterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getSlotsByDay = (day: DayOfWeek) =>
    routine.filter((r) => r.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleEdit = (slot: RoutineSlot) => {
    setEditingSlot(slot);
    setDefaultDay(slot.dayOfWeek);
    setDialogOpen(true);
  };

  const handleAddForDay = (day: DayOfWeek) => {
    setEditingSlot(null);
    setDefaultDay(day);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await routineService.delete(deleteTarget.id);
    toast.success('Class removed.');
    setDeleteTarget(null);
    await loadData();
  };

  const handleLoad5thSemRoutine = async () => {
    setLoadingRoutine(true);
    try {
      await seed5thSemesterRoutine(true);
      await loadData();
      toast.success('5th Semester routine loaded successfully!');
    } catch {
      toast.error('Failed to load 5th semester routine.');
    } finally {
      setLoadingRoutine(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Routine</h1>
          <p className="text-sm text-muted-foreground">Semester {profile.currentSemester} · Weekly schedule</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {profile?.currentSemester === 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoad5thSemRoutine}
              disabled={loadingRoutine}
              className="text-xs"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              {routine.length === 0 ? 'Load 5th Sem Routine' : 'Reset to 5th Sem Routine'}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingSlot(null);
          }}>
            <Button onClick={() => { setEditingSlot(null); setDefaultDay('sunday'); setDialogOpen(true); }} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Class
            </Button>
            <DialogContent className="max-w-md">
              <RoutineForm
                key={editingSlot?.id || 'new'}
                slot={editingSlot}
                defaultDay={defaultDay}
                subjects={subjects}
                onSubmit={async (data) => {
                  if (!semesterId) return;
                  if (editingSlot) {
                    await routineService.update(editingSlot.id, data);
                    toast.success('Class updated.');
                  } else {
                    await routineService.create(semesterId, data);
                    toast.success('Class added.');
                  }
                  setDialogOpen(false);
                  setEditingSlot(null);
                  await loadData();
                }}
                onCancel={() => { setDialogOpen(false); setEditingSlot(null); }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const slots = getSlotsByDay(day);
          const isToday = day === today;
          return (
            <Card key={day} className={`overflow-hidden transition-all ${isToday ? 'border-primary shadow-xs ring-1 ring-primary/20' : ''}`}>
              <CardHeader className="pb-2 pt-3 px-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{DAY_LABELS[day]}</CardTitle>
                    {isToday && <Badge variant="default" className="text-xs py-0">Today</Badge>}
                    <Badge variant="outline" className="text-xs ml-1">{slots.length} class{slots.length !== 1 ? 'es' : ''}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-primary"
                    onClick={() => handleAddForDay(day)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3">
                {slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 italic">No classes scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const subject = subjects.find((s) => s.id === slot.subjectId);
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center gap-3 rounded-lg border border-border/70 p-2.5 bg-card hover:border-primary/40 transition-colors"
                        >
                          {/* Subject Color Indicator */}
                          <div
                            className="w-1.5 self-stretch rounded-full shrink-0"
                            style={{ backgroundColor: subject?.color || '#3b82f6' }}
                          />

                          <div className="text-xs text-muted-foreground min-w-22.5 font-mono font-medium">
                            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{subject?.name || 'Unknown Subject'}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              {subject?.code && <span className="font-mono text-[0.7rem] bg-muted px-1 rounded">{subject.code}</span>}
                              {slot.room && <span>Room: <strong className="text-foreground">{slot.room}</strong></span>}
                              {slot.teacher && <span className="truncate">· {slot.teacher}</span>}
                            </div>
                          </div>

                          {/* Action Buttons — fully visible and mobile friendly */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Edit Class"
                              onClick={() => handleEdit(slot)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete Class"
                              onClick={() => setDeleteTarget(slot)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this class?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the class from the routine.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoutineForm({
  slot,
  defaultDay,
  subjects,
  onSubmit,
  onCancel,
}: {
  slot: RoutineSlot | null;
  defaultDay: DayOfWeek;
  subjects: { id: string; name: string; code?: string }[];
  onSubmit: (data: RoutineSlotFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RoutineSlotFormData>({
    resolver: zodResolver(routineSlotSchema),
    defaultValues: {
      subjectId: slot?.subjectId || '',
      dayOfWeek: slot?.dayOfWeek || defaultDay,
      startTime: slot?.startTime || '10:40',
      endTime: slot?.endTime || '12:00',
      room: slot?.room || '641',
    },
  });

  const doSubmit = async (data: RoutineSlotFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader>
        <DialogTitle>{slot ? 'Edit Class' : 'Add Class'}</DialogTitle>
        <DialogDescription>{slot ? 'Update scheduled class timing or room.' : 'Add a class to the weekly routine.'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Subject *</Label>
          <Select value={watch('subjectId')} onValueChange={(v) => { if (v) setValue('subjectId', v); }}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Day *</Label>
          <Select value={watch('dayOfWeek')} onValueChange={(v) => { if (v) setValue('dayOfWeek', v as DayOfWeek); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time *</Label>
            <Input type="time" {...register('startTime')} />
          </div>
          <div className="space-y-2">
            <Label>End Time *</Label>
            <Input type="time" {...register('endTime')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Room</Label>
          <Input placeholder="e.g. 641, 431, 533" {...register('room')} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : slot ? 'Update Class' : 'Add Class'}</Button>
      </DialogFooter>
    </form>
  );
}
