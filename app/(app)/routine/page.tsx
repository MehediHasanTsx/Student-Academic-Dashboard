'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { useAuth } from '@/components/providers/auth-provider';
import { routineService } from '@/lib/services/routine.service';
import { seed5thSemesterRoutine } from '@/lib/db/seed';
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  DEFAULT_5TH_SEMESTER_ROUTINE_META,
  ROUTINE_TEACHER_LEGEND,
} from '@/lib/constants';
import { formatTime, getCurrentDay } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { routineSlotSchema, type RoutineSlotFormData } from '@/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Plus,
  Trash2,
  Pencil,
  RotateCcw,
  BookOpen,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RoutineSlot, DayOfWeek } from '@/types/database';

export default function RoutinePage() {
  const { profile } = useProfile();
  const { isAdmin } = useAuth();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);

  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'All' | 'P' | 'Q' | 'R' | 'my'>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>('sunday');
  const [deleteTarget, setDeleteTarget] = useState<RoutineSlot | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const today = getCurrentDay();

  // Detect user's lab group from roll number
  const myGroup = useMemo<'P' | 'Q' | 'R' | null>(() => {
    if (!profile?.rollNumber) return null;
    const clean = profile.rollNumber.replace(/\D/g, '');
    const roll = parseInt(clean, 10);
    if (isNaN(roll)) return null;
    if (roll >= 2 && roll <= 65) return 'P';
    if (roll >= 66 && roll <= 126) return 'Q';
    if (roll >= 127 && roll <= 193) return 'R';
    return null;
  }, [profile?.rollNumber]);

  const loadData = async () => {
    if (!semesterId) return;
    let data = await routineService.getBySemester(semesterId);

    // Auto-seed if 5th semester routine is empty
    if (data.length === 0 && profile?.currentSemester === 5) {
      await seed5thSemesterRoutine();
      data = await routineService.getBySemester(semesterId);
    }

    setRoutine(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching from IndexedDB
    void loadData();
  }, [semesterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveGroup = selectedGroup === 'my' ? (myGroup || 'All') : selectedGroup;

  const getFilteredSlotsByDay = (day: DayOfWeek) => {
    return routine
      .filter((r) => r.dayOfWeek === day)
      .filter((r) => {
        if (effectiveGroup === 'All') return true;
        // Theory classes apply to everyone
        if (!r.group || r.group === 'All') return true;
        return r.group === effectiveGroup;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || (a.group || '').localeCompare(b.group || ''));
  };

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

  const handleResetToRevisedNotice = async () => {
    setResetting(true);
    try {
      await seed5thSemesterRoutine(true);
      await loadData();
      toast.success('Restored official DCC revised class routine.');
      setResetConfirmOpen(false);
    } catch {
      toast.error('Failed to reset routine.');
    } finally {
      setResetting(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Official Notice Header Replica ── */}
      <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-card via-card to-primary/5 p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold px-2.5 py-0.5 text-xs">
                Official Department Notice
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Session: {DEFAULT_5TH_SEMESTER_ROUTINE_META.session}
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {DEFAULT_5TH_SEMESTER_ROUTINE_META.title}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              B.Sc (Hons.) in CSE, Part-III, 5th semester · Effective from <strong>{DEFAULT_5TH_SEMESTER_ROUTINE_META.effectiveDate}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-right">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1 justify-end">
                <MapPin className="h-3 w-3 text-primary" />
                {DEFAULT_5TH_SEMESTER_ROUTINE_META.section}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Main Lecture Hall: Room #{DEFAULT_5TH_SEMESTER_ROUTINE_META.room}
              </p>
            </div>
          </div>
        </div>

        {/* Lab Grouping Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60">
          {DEFAULT_5TH_SEMESTER_ROUTINE_META.labGroups.map((lg) => {
            const isMyGroup = myGroup === lg.group;
            return (
              <div
                key={lg.group}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                  isMyGroup
                    ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/30'
                    : 'border-border/70 bg-card/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md font-bold text-xs ${
                      lg.group === 'P'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : lg.group === 'Q'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {lg.group}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{lg.label}</p>
                    <p className="text-[10px] text-muted-foreground">Roll range: {lg.rollRange}</p>
                  </div>
                </div>
                {isMyGroup && (
                  <Badge variant="outline" className="text-[10px] border-primary text-primary px-1.5 py-0 h-5">
                    Your Group
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Lab Group Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Filter by:
          </span>
          <Button
            variant={selectedGroup === 'All' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setSelectedGroup('All')}
          >
            All Classes
          </Button>

          {myGroup && (
            <Button
              variant={selectedGroup === 'my' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs rounded-full px-3 gap-1 border-primary/50"
              onClick={() => setSelectedGroup('my')}
            >
              <CheckCircle2 className="h-3 w-3" />
              My Group ({myGroup})
            </Button>
          )}

          <Button
            variant={selectedGroup === 'P' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setSelectedGroup('P')}
          >
            Group P
          </Button>
          <Button
            variant={selectedGroup === 'Q' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setSelectedGroup('Q')}
          >
            Group Q
          </Button>
          <Button
            variant={selectedGroup === 'R' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setSelectedGroup('R')}
          >
            Group R
          </Button>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setResetConfirmOpen(true)}
              title="Reset routine to official DCC notice schedule"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Notice
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                setEditingSlot(null);
                setDefaultDay('sunday');
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Class
            </Button>
          </div>
        )}
      </div>

      {/* ── Weekly Routine Day Cards ── */}
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const slots = getFilteredSlotsByDay(day);
          const isToday = day === today;
          const isWeekend = day === 'friday' || day === 'saturday';

          // Hide completely empty days that are not today and not regular college days
          if (slots.length === 0 && (isWeekend || day === 'tuesday')) {
            return (
              <Card key={day} className="border-dashed opacity-60">
                <CardHeader className="py-2.5 px-4 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      {DAY_LABELS[day]}
                    </CardTitle>
                    <span className="text-[11px] text-muted-foreground italic">
                      {isWeekend ? 'Weekend · No Classes' : 'No Classes Scheduled'}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            );
          }

          return (
            <Card
              key={day}
              className={`overflow-hidden transition-all ${
                isToday ? 'border-primary shadow-xs ring-1 ring-primary/20' : 'border-border/70'
              }`}
            >
              <CardHeader className="pb-2 pt-3 px-4 bg-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      {DAY_LABELS[day]}
                    </CardTitle>
                    {isToday && <Badge variant="default" className="text-xs py-0">Today</Badge>}
                    <Badge variant="outline" className="text-xs ml-1">
                      {slots.length} class{slots.length !== 1 ? 'es' : ''}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-primary"
                      onClick={() => handleAddForDay(day)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Class
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3">
                {slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center italic">
                    No classes scheduled for {DAY_LABELS[day]} matching the selected filter.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {slots.map((slot) => {
                      const subject = subjects.find((s) => s.id === slot.subjectId);
                      const isLab = subject?.type === 'lab' || slot.subjectId.includes('530202') || slot.subjectId.includes('530204') || slot.subjectId.includes('530206');
                      const isMyGroupClass = slot.group === myGroup;

                      return (
                        <div
                          key={slot.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                            isMyGroupClass
                              ? 'border-primary/40 bg-primary/5 shadow-xs'
                              : 'border-border/70 bg-card hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Color bar */}
                            <div
                              className="w-1.5 self-stretch rounded-full shrink-0"
                              style={{ backgroundColor: subject?.color || (isLab ? '#06b6d4' : '#3b82f6') }}
                            />

                            {/* Timing */}
                            <div className="shrink-0 flex items-center sm:flex-col sm:items-start text-xs font-mono font-semibold text-foreground gap-1.5 sm:gap-0 min-w-25">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3 text-primary shrink-0" />
                                {formatTime(slot.startTime)}
                              </span>
                              <span className="text-[11px] text-muted-foreground/80 pl-4 sm:pl-0">
                                to {formatTime(slot.endTime)}
                              </span>
                            </div>

                            {/* Subject & Teacher info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold truncate text-foreground">
                                  {subject?.name || 'Class Subject'}
                                </p>
                                {subject?.code && (
                                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded font-bold text-muted-foreground">
                                    {subject.code}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                {slot.room && (
                                  <span className="inline-flex items-center gap-1 font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[11px]">
                                    <MapPin className="h-3 w-3 text-rose-500" />
                                    Room #{slot.room}
                                  </span>
                                )}
                                {slot.teacher && (
                                  <span className="truncate">
                                    Teacher: <strong className="text-foreground">{slot.teacher}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Group & Admin Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                            {slot.group && slot.group !== 'All' ? (
                              <Badge
                                className={`text-[10px] font-bold px-2 py-0.5 ${
                                  slot.group === 'P'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                    : slot.group === 'Q'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                }`}
                              >
                                Group {slot.group} Lab
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                Theory (All)
                              </Badge>
                            )}

                            {isAdmin && (
                              <div className="flex items-center gap-1">
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
                            )}
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

      {/* ── Official Subject & Faculty Legend (from attached notice) ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm space-y-0">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">Course & Faculty Legend</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Dhaka City College · CSE Department
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-140">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <th className="py-2.5 px-4 w-24">Course Code</th>
                <th className="py-2.5 px-4">Subject Title</th>
                <th className="py-2.5 px-4">Course Teachers</th>
                <th className="py-2.5 px-4 text-right w-28">Initials</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROUTINE_TEACHER_LEGEND.map((t) => (
                <tr key={t.code} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-4 font-mono font-bold text-primary">
                    {t.subjectCodes.join(', ')}
                  </td>
                  <td className="py-2 px-4 text-foreground">
                    {t.subjectCodes.map((code) => {
                      const sub = subjects.find((s) => s.code === code);
                      return sub ? sub.name : code;
                    }).filter((v, i, a) => a.indexOf(v) === i).join(' / ')}
                  </td>
                  <td className="py-2 px-4 font-medium text-foreground">
                    {t.name}
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-bold text-muted-foreground">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">
                      {t.code}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Admin Edit/Create Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingSlot(null);
        }}
      >
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
            onCancel={() => {
              setDialogOpen(false);
              setEditingSlot(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this class?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the class from the routine schedule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Official DCC Routine?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will overwrite the 5th semester routine with the official DCC Revised Class Routine with Section B, Room 641, and Lab Groups P/Q/R.
              </p>
              <div className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                🛡️ Your attendance history, subjects, and personal notes will <strong>NOT</strong> be affected.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToRevisedNotice} disabled={resetting} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {resetting ? 'Resetting...' : 'Reset Routine'}
            </AlertDialogAction>
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
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoutineSlotFormData>({
    resolver: zodResolver(routineSlotSchema),
    defaultValues: {
      subjectId: slot?.subjectId || '',
      dayOfWeek: slot?.dayOfWeek || defaultDay,
      startTime: slot?.startTime || '10:40',
      endTime: slot?.endTime || '12:00',
      room: slot?.room || '641',
      teacher: slot?.teacher || '',
      group: slot?.group || 'All',
      section: slot?.section || 'B',
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
        <DialogTitle>{slot ? 'Edit Class Slot' : 'Add Class Slot'}</DialogTitle>
        <DialogDescription>
          {slot ? 'Update scheduled class timing, room, or lab group.' : 'Add a class slot to the weekly schedule.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3.5 py-4 text-xs">
        <div className="space-y-1.5">
          <Label className="text-xs">Subject *</Label>
          <Select
            value={watch('subjectId')}
            onValueChange={(v) => {
              if (v) setValue('subjectId', v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Day *</Label>
            <Select
              value={watch('dayOfWeek')}
              onValueChange={(v) => {
                if (v) setValue('dayOfWeek', v as DayOfWeek);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DAY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Lab Group / Audience</Label>
            <Select
              value={watch('group') || 'All'}
              onValueChange={(v) => {
                if (v) setValue('group', v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All / Theory (Everyone)</SelectItem>
                <SelectItem value="P">Group P (Roll 2–65)</SelectItem>
                <SelectItem value="Q">Group Q (Roll 66–126)</SelectItem>
                <SelectItem value="R">Group R (Roll 127–193)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Time *</Label>
            <Input type="time" {...register('startTime')} />
            {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Time *</Label>
            <Input type="time" {...register('endTime')} />
            {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Room</Label>
            <Input placeholder="e.g. 641, 533, 431, 422" {...register('room')} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Teacher / Initials</Label>
            <Input placeholder="e.g. Salma Parvin (SP)" {...register('teacher')} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : slot ? 'Update Class' : 'Add Class'}
        </Button>
      </DialogFooter>
    </form>
  );
}
