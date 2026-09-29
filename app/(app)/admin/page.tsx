'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { mainDataService } from '@/lib/services/main-data.service';
import type { Subject, RoutineSlot, Exam, DayOfWeek, SubjectType } from '@/types/database';
import { DAYS_OF_WEEK, DAY_LABELS, SEMESTER_COUNT } from '@/lib/constants';
import { formatTime, generateId } from '@/lib/utils/formatters';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShieldCheck,
  CloudUpload,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Calendar,
  GraduationCap,
  Clock,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [selectedSemester, setSelectedSemester] = useState('5');
  const semesterId = `semester-${selectedSemester}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);

  // In-memory main data state being managed
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // Modals state
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineSlot | null>(null);
  const [routineDefaultDay, setRoutineDefaultDay] = useState<DayOfWeek>('sunday');

  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'routine' | 'exam';
    id: string;
    name: string;
  } | null>(null);

  // Load Main Data for the selected semester
  const loadMainData = useCallback(async (semId: string) => {
    setLoading(true);
    try {
      const data = await mainDataService.fetchMainData(semId);
      setSubjects(data.subjects || []);
      setRoutine(data.routine || []);
      setExams(data.exams || []);
      setLastPublished(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load main data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
      return;
    }
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data loading
      void loadMainData(semesterId);
    }
  }, [authLoading, isAdmin, semesterId, loadMainData, router]);

  // Publish changes to Neon
  const handlePublish = async () => {
    setSaving(true);
    try {
      const result = await mainDataService.publishMainData(semesterId, {
        subjects,
        routine,
        exams,
      });
      setLastPublished(new Date(result.updatedAt).toLocaleString());
      toast.success(`Published Main Data for Semester ${selectedSemester} to Cloud!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ── Subject Operations ──────────────────────────────────
  const handleSaveSubject = (subData: Partial<Subject>) => {
    const now = new Date();
    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === editingSubject.id ? ({ ...s, ...subData, updatedAt: now } as Subject) : s))
      );
      toast.success('Subject updated in draft.');
    } else {
      const newSub: Subject = {
        id: `subj-sem${selectedSemester}-${subData.code || generateId().slice(0, 6)}`,
        semesterId,
        name: subData.name || '',
        code: subData.code || '',
        credits: subData.credits || 3,
        type: subData.type || 'theory',
        color: subData.color || '#3B82F6',
        teacher: subData.teacher,
        room: subData.room,
        order: subjects.length,
        createdAt: now,
        updatedAt: now,
      };
      setSubjects((prev) => [...prev, newSub]);
      toast.success('Subject added to draft.');
    }
    setSubjectDialogOpen(false);
    setEditingSubject(null);
  };

  const handleMoveSubject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;
    const newSubs = [...subjects];
    const [removed] = newSubs.splice(index, 1);
    newSubs.splice(targetIndex, 0, removed);
    const reordered = newSubs.map((s, idx) => ({ ...s, order: idx }));
    setSubjects(reordered);
  };

  // ── Routine Operations ──────────────────────────────────
  const handleSaveRoutineSlot = (slotData: Partial<RoutineSlot>) => {
    const now = new Date();
    if (editingRoutine) {
      setRoutine((prev) =>
        prev.map((r) => (r.id === editingRoutine.id ? ({ ...r, ...slotData } as RoutineSlot) : r))
      );
      toast.success('Class slot updated in draft.');
    } else {
      const newSlot: RoutineSlot = {
        id: generateId(),
        semesterId,
        subjectId: slotData.subjectId || '',
        dayOfWeek: slotData.dayOfWeek || 'sunday',
        startTime: slotData.startTime || '09:00',
        endTime: slotData.endTime || '10:30',
        room: slotData.room,
        teacher: slotData.teacher,
        createdAt: now,
      };
      setRoutine((prev) => [...prev, newSlot]);
      toast.success('Class slot added to draft.');
    }
    setRoutineDialogOpen(false);
    setEditingRoutine(null);
  };

  // ── Exam Operations ─────────────────────────────────────
  const handleSaveExam = (examData: Partial<Exam>) => {
    const now = new Date();
    if (editingExam) {
      setExams((prev) =>
        prev.map((e) => (e.id === editingExam.id ? ({ ...e, ...examData, updatedAt: now } as Exam) : e))
      );
      toast.success('Exam updated in draft.');
    } else {
      const newExam: Exam = {
        id: generateId(),
        semesterId,
        subjectId: examData.subjectId || '',
        name: examData.name || '',
        date: examData.date || new Date().toISOString().split('T')[0],
        time: examData.time,
        room: examData.room,
        notes: examData.notes,
        createdAt: now,
        updatedAt: now,
      };
      setExams((prev) => [...prev, newExam]);
      toast.success('Exam added to draft.');
    }
    setExamDialogOpen(false);
    setEditingExam(null);
  };

  // ── Deletion execution ──────────────────────────────────
  const executeDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'subject') {
      setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      // Also remove associated routine slots
      setRoutine((prev) => prev.filter((r) => r.subjectId !== deleteTarget.id));
      toast.success('Subject removed from draft.');
    } else if (deleteTarget.type === 'routine') {
      setRoutine((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Routine slot removed from draft.');
    } else if (deleteTarget.type === 'exam') {
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success('Exam removed from draft.');
    }
    setDeleteTarget(null);
  };

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Admin Controls</h1>
              <Badge variant="default" className="bg-primary/90 text-xs">Admin Only</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage authoritative Main Data for DCC CSE (Subjects, Routine, Exams). When students click &quot;Sync with Main&quot;, they pull from here.
            </p>
            {lastPublished && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Last published to cloud: <span className="font-medium text-foreground">{lastPublished}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Semester:</Label>
              <Select value={selectedSemester} onValueChange={(v) => { if (v) setSelectedSemester(v); }}>
                <SelectTrigger className="w-30 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: SEMESTER_COUNT }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Semester {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadMainData(semesterId)}
              disabled={loading || saving}
              title="Reload from Cloud"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              onClick={handlePublish}
              disabled={saving || loading}
              className="gap-1.5 shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              Save & Publish to Main
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="subjects" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Subjects ({subjects.length})
            </TabsTrigger>
            <TabsTrigger value="routine" className="gap-2">
              <Calendar className="h-4 w-4" />
              Routine ({routine.length})
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Exams ({exams.length})
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: MAIN SUBJECTS ──────────────────────── */}
          <TabsContent value="subjects" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Official Semester {selectedSemester} Subjects</h2>
                <p className="text-xs text-muted-foreground">
                  Order here dictates default subject listing for all students.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSubject(null);
                  setSubjectDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Main Subject
              </Button>
            </div>

            {subjects.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">No subjects added for Semester {selectedSemester} yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {subjects.map((sub, index) => {
                  const isFirst = index === 0;
                  const isLast = index === subjects.length - 1;
                  return (
                    <Card key={sub.id} className="relative overflow-hidden border-border/60">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sub.color || '#3B82F6' }} />
                      <CardContent className="p-4 pl-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">{sub.code}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{sub.type}</Badge>
                              <Badge variant="secondary" className="text-[10px]">{sub.credits} cr</Badge>
                            </div>
                            <h3 className="font-semibold text-sm leading-snug mt-1 truncate">{sub.name}</h3>
                            <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                              {sub.teacher && <span>Teacher: {sub.teacher}</span>}
                              {sub.room && <span>• Room: {sub.room}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20"
                              disabled={isFirst}
                              title="Move Up"
                              onClick={() => handleMoveSubject(index, 'up')}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20"
                              disabled={isLast}
                              title="Move Down"
                              onClick={() => handleMoveSubject(index, 'down')}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Edit"
                              onClick={() => {
                                setEditingSubject(sub);
                                setSubjectDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete"
                              onClick={() => setDeleteTarget({ type: 'subject', id: sub.id, name: sub.name })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 2: MAIN ROUTINE ───────────────────────── */}
          <TabsContent value="routine" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Official Weekly Routine (Semester {selectedSemester})</h2>
                <p className="text-xs text-muted-foreground">Weekly schedule provided to all students upon routine sync.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingRoutine(null);
                  setRoutineDefaultDay('sunday');
                  setRoutineDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Class Slot
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = routine
                  .filter((r) => r.dayOfWeek === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <Card key={day} className="flex flex-col">
                    <CardHeader className="p-3.5 pb-2 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{DAY_LABELS[day]}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditingRoutine(null);
                          setRoutineDefaultDay(day);
                          setRoutineDialogOpen(true);
                        }}
                        title={`Add class to ${DAY_LABELS[day]}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 flex-1 space-y-2">
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 py-4 text-center">No classes scheduled</p>
                      ) : (
                        daySlots.map((slot) => {
                          const subject = subjects.find((s) => s.id === slot.subjectId);
                          return (
                            <div
                              key={slot.id}
                              className="rounded-lg border bg-card p-2.5 space-y-1.5 text-xs relative group shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="font-semibold text-foreground truncate">
                                  {subject ? subject.name : 'Unknown Subject'}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      setEditingRoutine(slot);
                                      setRoutineDefaultDay(slot.dayOfWeek);
                                      setRoutineDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: 'routine',
                                        id: slot.id,
                                        name: `${subject?.name || 'Class'} (${DAY_LABELS[slot.dayOfWeek]})`,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {slot.room && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Room {slot.room}</Badge>}
                                {slot.teacher && <span>Teacher: {slot.teacher}</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── TAB 3: MAIN EXAMS ─────────────────────────── */}
          <TabsContent value="exams" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Official Semester Exams</h2>
                <p className="text-xs text-muted-foreground">Exams created here are available for students to sync.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingExam(null);
                  setExamDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add Main Exam
              </Button>
            </div>

            {exams.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">No official exams published for Semester {selectedSemester} yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {exams.map((exam) => {
                  const subject = subjects.find((s) => s.id === exam.subjectId);
                  return (
                    <Card key={exam.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-semibold text-sm">{exam.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {subject?.name || 'Any Subject'} • Date: {exam.date} {exam.time ? `• Time: ${exam.time}` : ''} {exam.room ? `• Room ${exam.room}` : ''}
                          </p>
                          {exam.notes && (
                            <p className="text-xs text-muted-foreground/80 italic">Notes: {exam.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingExam(exam);
                              setExamDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'exam',
                                id: exam.id,
                                name: exam.name,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── Dialog: Add/Edit Subject ─────────────────────── */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Main Subject' : 'Add Main Subject'}</DialogTitle>
            <DialogDescription>Define the official subject details for all students.</DialogDescription>
          </DialogHeader>
          <SubjectFormModal
            subject={editingSubject}
            onSubmit={handleSaveSubject}
            onCancel={() => setSubjectDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add/Edit Routine Slot ────────────────── */}
      <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoutine ? 'Edit Class Slot' : 'Add Class Slot'}</DialogTitle>
            <DialogDescription>Define the routine timing and room for this class.</DialogDescription>
          </DialogHeader>
          <RoutineFormModal
            slot={editingRoutine}
            defaultDay={routineDefaultDay}
            subjects={subjects}
            onSubmit={handleSaveRoutineSlot}
            onCancel={() => setRoutineDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Add/Edit Exam ────────────────────────── */}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExam ? 'Edit Main Exam' : 'Add Main Exam'}</DialogTitle>
            <DialogDescription>Publish an official semester exam date and syllabus.</DialogDescription>
          </DialogHeader>
          <ExamFormModal
            exam={editingExam}
            subjects={subjects}
            onSubmit={handleSaveExam}
            onCancel={() => setExamDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Alert: Confirm Delete ────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Main Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{deleteTarget?.name}&quot; from Main Data? Remember to click &quot;Save & Publish to Main&quot; to apply to the cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Modals / Forms ─────────────────────────────────────

function SubjectFormModal({
  subject,
  onSubmit,
  onCancel,
}: {
  subject: Subject | null;
  onSubmit: (data: Partial<Subject>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [credits, setCredits] = useState(subject?.credits ? String(subject.credits) : '3');
  const [type, setType] = useState<SubjectType>(subject?.type || 'theory');
  const [teacher, setTeacher] = useState(subject?.teacher || '');
  const [room, setRoom] = useState(subject?.room || '');
  const [color, setColor] = useState(subject?.color || '#3B82F6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Subject name is required.');
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits: parseFloat(credits) || 3,
      type,
      teacher: teacher.trim() || undefined,
      room: room.trim() || undefined,
      color,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Subject Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operating System" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Subject Code *</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 530203" required />
        </div>
        <div className="space-y-2">
          <Label>Credits *</Label>
          <Input type="number" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => { if (v) setType(v as SubjectType); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="theory">Theory</SelectItem>
              <SelectItem value="lab">Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Teacher Initials</Label>
          <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="e.g. MK / SA" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Default Room</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 704" />
        </div>
        <div className="space-y-2">
          <Label>Color Tag</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 rounded border bg-background cursor-pointer"
            />
            <span className="text-xs font-mono text-muted-foreground">{color}</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{subject ? 'Update Subject' : 'Add Subject'}</Button>
      </DialogFooter>
    </form>
  );
}

function RoutineFormModal({
  slot,
  defaultDay,
  subjects,
  onSubmit,
  onCancel,
}: {
  slot: RoutineSlot | null;
  defaultDay: DayOfWeek;
  subjects: Subject[];
  onSubmit: (data: Partial<RoutineSlot>) => void;
  onCancel: () => void;
}) {
  const [subjectId, setSubjectId] = useState(slot?.subjectId || subjects[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(slot?.dayOfWeek || defaultDay);
  const [startTime, setStartTime] = useState(slot?.startTime || '09:00');
  const [endTime, setEndTime] = useState(slot?.endTime || '10:30');
  const [room, setRoom] = useState(slot?.room || '');
  const [teacher, setTeacher] = useState(slot?.teacher || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return toast.error('Please select a subject.');
    onSubmit({
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim() || undefined,
      teacher: teacher.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Select value={subjectId} onValueChange={(v) => { if (v) setSubjectId(v); }}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Day *</Label>
        <Select value={dayOfWeek} onValueChange={(v) => { if (v) setDayOfWeek(v as DayOfWeek); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAYS_OF_WEEK.map((d) => (
              <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Time *</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>End Time *</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Room</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 704" />
        </div>
        <div className="space-y-2">
          <Label>Teacher</Label>
          <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="e.g. MK" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{slot ? 'Update Class' : 'Add Class'}</Button>
      </DialogFooter>
    </form>
  );
}

function ExamFormModal({
  exam,
  subjects,
  onSubmit,
  onCancel,
}: {
  exam: Exam | null;
  subjects: Subject[];
  onSubmit: (data: Partial<Exam>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(exam?.name || 'Midterm Examination');
  const [subjectId, setSubjectId] = useState(exam?.subjectId || subjects[0]?.id || '');
  const [date, setDate] = useState(exam?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(exam?.time || '10:00 AM');
  const [room, setRoom] = useState(exam?.room || '704');
  const [notes, setNotes] = useState(exam?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Exam title is required.');
    if (!subjectId) return toast.error('Please select a subject.');
    onSubmit({
      name: name.trim(),
      subjectId,
      date,
      time: time.trim() || undefined,
      room: room.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Exam Title *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Midterm Examination" required />
      </div>
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Select value={subjectId} onValueChange={(v) => { if (v) setSubjectId(v); }}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 10:00 AM" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Room</Label>
        <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 704" />
      </div>
      <div className="space-y-2">
        <Label>Notes / Syllabus</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Chapters 1-4" />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{exam ? 'Update Exam' : 'Add Exam'}</Button>
      </DialogFooter>
    </form>
  );
}
