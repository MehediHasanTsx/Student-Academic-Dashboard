'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { mainDataService } from '@/lib/services/main-data.service';
import type { Subject, RoutineSlot, Exam, DayOfWeek, SubjectType, ExamRoutineItem, LabGroup, SeatPlanRange, ExamType } from '@/types/database';
import { DAYS_OF_WEEK, DAY_LABELS, SEMESTER_COUNT, DEFAULT_LAB_GROUPS, DEFAULT_5TH_SEMESTER_EXAM_ROUTINE } from '@/lib/constants';
import { formatTime, generateId } from '@/lib/utils/formatters';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Users,
  FileText,
  Building,
  Layers,
  RotateCcw,
  Search,
  Download,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

const EXAM_TYPE_OPTIONS: { value: ExamType; label: string }[] = [
  { value: 'in_course', label: 'In-Course Exam' },
  { value: 'semester_final', label: 'Semester Final' },
  { value: 'nu_final', label: 'NU Final Exam' },
];

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [selectedSemester, setSelectedSemester] = useState('5');
  const semesterId = `semester-${selectedSemester}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);

  // In-memory main data state being managed
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [routine, setRoutine] = useState<RoutineSlot[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examRoutines, setExamRoutines] = useState<ExamRoutineItem[]>([]);
  const [labGroups, setLabGroups] = useState<LabGroup[]>(DEFAULT_LAB_GROUPS);

  // Active Tab
  const [activeTab, setActiveTab] = useState('subjects');

  // Search & Filter States
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<'all' | 'theory' | 'lab'>('all');
  const [activeRoutineDay, setActiveRoutineDay] = useState<DayOfWeek | 'all'>('all');
  const [activeRoutineGroupFilter, setActiveRoutineGroupFilter] = useState<string>('all');
  const [examRoutineTypeFilter, setExamRoutineTypeFilter] = useState<ExamType | 'all'>('all');

  // Modals state
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineSlot | null>(null);
  const [routineDefaultDay, setRoutineDefaultDay] = useState<DayOfWeek>('sunday');

  const [labGroupDialogOpen, setLabGroupDialogOpen] = useState(false);
  const [editingLabGroup, setEditingLabGroup] = useState<LabGroup | null>(null);

  const [examRoutineDialogOpen, setExamRoutineDialogOpen] = useState(false);
  const [editingExamRoutine, setEditingExamRoutine] = useState<ExamRoutineItem | null>(null);

  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'subject' | 'routine' | 'labGroup' | 'examRoutine' | 'exam';
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
      setExamRoutines(data.examRoutines || (semId === 'semester-5' ? DEFAULT_5TH_SEMESTER_EXAM_ROUTINE : []));
      setLabGroups(data.labGroups && data.labGroups.length > 0 ? data.labGroups : (semId === 'semester-5' ? DEFAULT_LAB_GROUPS : []));
      setLastPublished(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : null);
      setIsDraftDirty(false);
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

  // Publish changes to Cloud
  const handlePublish = async () => {
    setSaving(true);
    try {
      const result = await mainDataService.publishMainData(semesterId, {
        subjects,
        routine,
        exams,
        examRoutines,
        labGroups,
      });
      setLastPublished(new Date(result.updatedAt).toLocaleString());
      setIsDraftDirty(false);
      toast.success(`Published Main Data for Semester ${selectedSemester} to Cloud!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const payload = {
      semesterId,
      exportedAt: new Date().toISOString(),
      subjects,
      routine,
      labGroups,
      examRoutines,
      exams,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dcc-cse-main-data-sem${selectedSemester}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded Main Data JSON backup.');
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
    setIsDraftDirty(true);
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
    setIsDraftDirty(true);
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
        group: slotData.group,
        section: slotData.section,
        createdAt: now,
      };
      setRoutine((prev) => [...prev, newSlot]);
      toast.success('Class slot added to draft.');
    }
    setIsDraftDirty(true);
    setRoutineDialogOpen(false);
    setEditingRoutine(null);
  };

  // ── Lab Group Operations ─────────────────────────────────
  const handleSaveLabGroup = (groupData: LabGroup) => {
    if (editingLabGroup) {
      setLabGroups((prev) =>
        prev.map((g) => (g.group === editingLabGroup.group ? groupData : g))
      );
      toast.success(`Group ${groupData.group} updated in draft.`);
    } else {
      if (labGroups.some((g) => g.group.toUpperCase() === groupData.group.toUpperCase())) {
        toast.error(`Group '${groupData.group}' already exists.`);
        return;
      }
      setLabGroups((prev) => [...prev, groupData]);
      toast.success(`Group ${groupData.group} added to draft.`);
    }
    setIsDraftDirty(true);
    setLabGroupDialogOpen(false);
    setEditingLabGroup(null);
  };

  const handleResetLabGroupsDefault = () => {
    setLabGroups(DEFAULT_LAB_GROUPS);
    setIsDraftDirty(true);
    toast.success('Reset lab groups to standard defaults (P, Q, R).');
  };

  // ── Exam Routine Operations ──────────────────────────────
  const handleSaveExamRoutine = (routineItem: ExamRoutineItem) => {
    const now = new Date();
    if (editingExamRoutine) {
      setExamRoutines((prev) =>
        prev.map((r) => (r.id === editingExamRoutine.id ? { ...routineItem, updatedAt: now } : r))
      );
      toast.success('Exam routine slot updated in draft.');
    } else {
      const newItem: ExamRoutineItem = {
        ...routineItem,
        id: routineItem.id || generateId(),
        semesterId,
        createdAt: now,
        updatedAt: now,
      };
      setExamRoutines((prev) => [...prev, newItem]);
      toast.success('Exam routine slot added to draft.');
    }
    setIsDraftDirty(true);
    setExamRoutineDialogOpen(false);
    setEditingExamRoutine(null);
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
    setIsDraftDirty(true);
    setExamDialogOpen(false);
    setEditingExam(null);
  };

  // ── Deletion execution ──────────────────────────────────
  const executeDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'subject') {
      setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setRoutine((prev) => prev.filter((r) => r.subjectId !== deleteTarget.id));
      toast.success('Subject removed from draft.');
    } else if (deleteTarget.type === 'routine') {
      setRoutine((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Routine slot removed from draft.');
    } else if (deleteTarget.type === 'labGroup') {
      setLabGroups((prev) => prev.filter((g) => g.group !== deleteTarget.id));
      toast.success('Lab group removed from draft.');
    } else if (deleteTarget.type === 'examRoutine') {
      setExamRoutines((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Exam routine slot removed from draft.');
    } else if (deleteTarget.type === 'exam') {
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success('Exam removed from draft.');
    }
    setIsDraftDirty(true);
    setDeleteTarget(null);
  };

  // Derived filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(subjectSearch.toLowerCase()) || s.code.toLowerCase().includes(subjectSearch.toLowerCase());
      const matchesType = subjectTypeFilter === 'all' || s.type === subjectTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [subjects, subjectSearch, subjectTypeFilter]);

  // Total credits calculation
  const totalCredits = useMemo(() => {
    return subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  }, [subjects]);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  // Check for lab group overlaps / gaps
  const groupOverlapWarning = useMemo(() => {
    const sorted = [...labGroups].sort((a, b) => a.rollStart - b.rollStart);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].rollEnd >= sorted[i + 1].rollStart) {
        return `Roll overlap detected between Group ${sorted[i].group} (up to ${sorted[i].rollEnd}) and Group ${sorted[i + 1].group} (from ${sorted[i + 1].rollStart})`;
      }
    }
    return null;
  }, [labGroups]);

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Main Hero Command Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-primary/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Admin Command Center
                  </h1>
                  <Badge variant="default" className="bg-primary/90 text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                    Official Publisher
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Publish authoritative Curriculum, Weekly Routines, Lab Groups, and Official Exam Notices for DCC CSE students.
                </p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-3 pt-1 text-xs flex-wrap">
              {lastPublished ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live on Cloud • {lastPublished}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  No cloud publish record
                </span>
              )}

              {isDraftDirty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Unsaved Draft Changes
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="h-9 gap-1.5 text-xs shadow-xs"
              title="Export complete semester data as JSON file"
            >
              <Download className="h-3.5 w-3.5" />
              Backup JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMainData(semesterId)}
              disabled={loading || saving}
              className="h-9 gap-1.5 text-xs shadow-xs"
              title="Reload data from server"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={saving || loading}
              className={`h-9 gap-1.5 text-xs font-semibold shadow-md transition-all ${
                isDraftDirty
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground ring-2 ring-primary/40 ring-offset-2'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
              {saving ? 'Publishing...' : 'Publish to Cloud'}
            </Button>
          </div>
        </div>

        {/* ── Quick Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-border/60">
          <div
            onClick={() => setActiveTab('subjects')}
            className="rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 p-3.5 text-center transition-all cursor-pointer group shadow-2xs"
          >
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <BookOpen className="h-3 w-3 text-primary" /> Subjects
            </p>
            <p className="text-xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {subjects.length}
            </p>
            <span className="text-[10px] text-muted-foreground">{totalCredits} total credits</span>
          </div>

          <div
            onClick={() => setActiveTab('routine')}
            className="rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 p-3.5 text-center transition-all cursor-pointer group shadow-2xs"
          >
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Class Slots
            </p>
            <p className="text-xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {routine.length}
            </p>
            <span className="text-[10px] text-muted-foreground">Weekly schedule</span>
          </div>

          <div
            onClick={() => setActiveTab('labGroups')}
            className="rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 p-3.5 text-center transition-all cursor-pointer group shadow-2xs"
          >
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-primary" /> Lab Groups
            </p>
            <p className="text-xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {labGroups.length}
            </p>
            <span className="text-[10px] text-muted-foreground">Roll configured</span>
          </div>

          <div
            onClick={() => setActiveTab('examRoutine')}
            className="rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 p-3.5 text-center transition-all cursor-pointer group shadow-2xs"
          >
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <FileText className="h-3 w-3 text-primary" /> Exam Notices
            </p>
            <p className="text-xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {examRoutines.length}
            </p>
            <span className="text-[10px] text-muted-foreground">With seat plans</span>
          </div>

          <div
            onClick={() => setActiveTab('exams')}
            className="rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 p-3.5 text-center col-span-2 sm:col-span-1 transition-all cursor-pointer group shadow-2xs"
          >
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <GraduationCap className="h-3 w-3 text-primary" /> Calendar Exams
            </p>
            <p className="text-xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {exams.length}
            </p>
            <span className="text-[10px] text-muted-foreground">Student tracker</span>
          </div>
        </div>
      </div>

      {/* ── Semester Bar & Context ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Target Semester:</span>
            <Select value={selectedSemester} onValueChange={(val) => { if (val) setSelectedSemester(val); }}>
              <SelectTrigger className="w-36 h-8 text-xs font-semibold rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: SEMESTER_COUNT }, (_, i) => i + 1).map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs font-medium">
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Edits are saved locally in draft. Hit <strong className="text-foreground">Publish to Cloud</strong> to push to all students.</span>
        </div>
      </div>

      {/* ── Main Tabbed Content ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Navigation Bar */}
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-11 items-center justify-start rounded-2xl bg-muted/70 p-1 text-muted-foreground w-auto border border-border/60 gap-1.5 shadow-2xs">
            <TabsTrigger value="subjects" className="text-xs px-4 py-2 gap-2 font-semibold rounded-xl shrink-0 transition-all data-active:bg-background data-active:text-foreground data-active:shadow-xs">
              <BookOpen className="h-4 w-4" />
              Subjects ({subjects.length})
            </TabsTrigger>
            <TabsTrigger value="routine" className="text-xs px-4 py-2 gap-2 font-semibold rounded-xl shrink-0 transition-all data-active:bg-background data-active:text-foreground data-active:shadow-xs">
              <Calendar className="h-4 w-4" />
              Routine ({routine.length})
            </TabsTrigger>
            <TabsTrigger value="labGroups" className="text-xs px-4 py-2 gap-2 font-semibold rounded-xl shrink-0 transition-all data-active:bg-background data-active:text-foreground data-active:shadow-xs">
              <Users className="h-4 w-4" />
              Lab Groups ({labGroups.length})
            </TabsTrigger>
            <TabsTrigger value="examRoutine" className="text-xs px-4 py-2 gap-2 font-semibold rounded-xl shrink-0 transition-all data-active:bg-background data-active:text-foreground data-active:shadow-xs">
              <FileText className="h-4 w-4" />
              Exam Routine ({examRoutines.length})
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-xs px-4 py-2 gap-2 font-semibold rounded-xl shrink-0 transition-all data-active:bg-background data-active:text-foreground data-active:shadow-xs">
              <GraduationCap className="h-4 w-4" />
              Exams ({exams.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 1: SUBJECTS
        ═══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="subjects" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Official Curriculum Subjects
                </CardTitle>
                <CardDescription className="text-xs">
                  Course codes, credits, types, and teacher initials for Semester {selectedSemester}.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative w-44 sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search subject or code..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg"
                  />
                </div>

                {/* Filter */}
                <Select value={subjectTypeFilter} onValueChange={(v) => setSubjectTypeFilter(v as 'all' | 'theory' | 'lab')}>
                  <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                  onClick={() => {
                    setEditingSubject(null);
                    setSubjectDialogOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Subject
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSubjects.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs space-y-2">
                  <BookOpen className="h-8 w-8 mx-auto opacity-30" />
                  <p>No subjects found for Semester {selectedSemester}.</p>
                  {subjectSearch && <Button variant="ghost" size="sm" onClick={() => setSubjectSearch('')} className="text-xs">Clear Search</Button>}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredSubjects.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-3 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-3.5 h-11 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: sub.color || '#3B82F6' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">{sub.name}</span>
                            <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 h-4.5 bg-muted/40 font-semibold">
                              {sub.code}
                            </Badge>
                            <Badge
                              variant={sub.type === 'lab' ? 'secondary' : 'outline'}
                              className="text-[10px] px-1.5 py-0 h-4.5 uppercase font-semibold"
                            >
                              {sub.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-2">
                            <span className="font-medium text-foreground">{sub.credits} Credits</span>
                            <span>•</span>
                            <span>Teacher: <strong className="text-foreground font-medium">{sub.teacher || 'TBA'}</strong></span>
                            {sub.room && (
                              <>
                                <span>•</span>
                                <span>Room: <strong className="text-foreground font-medium">#{sub.room}</strong></span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          disabled={idx === 0}
                          onClick={() => handleMoveSubject(idx, 'up')}
                          title="Move Up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          disabled={idx === filteredSubjects.length - 1}
                          onClick={() => handleMoveSubject(idx, 'down')}
                          title="Move Down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingSubject(sub);
                            setSubjectDialogOpen(true);
                          }}
                          title="Edit Subject"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              type: 'subject',
                              id: sub.id,
                              name: `${sub.name} (${sub.code})`,
                            })
                          }
                          title="Delete Subject"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 2: ROUTINE
        ═══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="routine" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Weekly Class Schedule Matrix
                </CardTitle>
                <CardDescription className="text-xs">
                  Schedule slots for Theory (All) & Lab Groups ({labGroups.map(g => g.group).join(', ')}) across weekdays.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                onClick={() => {
                  setEditingRoutine(null);
                  setRoutineDefaultDay(activeRoutineDay === 'all' ? 'sunday' : activeRoutineDay);
                  setRoutineDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Class Slot
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Day filter pills & Audience Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant={activeRoutineDay === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs rounded-lg px-2.5"
                    onClick={() => setActiveRoutineDay('all')}
                  >
                    All Days ({routine.length})
                  </Button>
                  {DAYS_OF_WEEK.map((d) => {
                    const count = routine.filter((r) => r.dayOfWeek === d).length;
                    return (
                      <Button
                        key={d}
                        variant={activeRoutineDay === d ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs rounded-lg px-2.5"
                        onClick={() => setActiveRoutineDay(d)}
                      >
                        {DAY_LABELS[d]} ({count})
                      </Button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground">Group:</span>
                  <Select value={activeRoutineGroupFilter} onValueChange={(val) => { if (val) setActiveRoutineGroupFilter(val); }}>
                    <SelectTrigger className="w-32 h-7 text-xs rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      <SelectItem value="All">Theory (All)</SelectItem>
                      {labGroups.map((lg) => (
                        <SelectItem key={lg.group} value={lg.group}>Group {lg.group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {routine.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs space-y-2">
                  <Calendar className="h-8 w-8 mx-auto opacity-30" />
                  <p>No class slots added yet for Semester {selectedSemester}.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {DAYS_OF_WEEK.filter((d) => activeRoutineDay === 'all' || activeRoutineDay === d).map((day) => {
                    const daySlots = routine
                      .filter((r) => r.dayOfWeek === day)
                      .filter((r) => {
                        if (activeRoutineGroupFilter === 'all') return true;
                        if (activeRoutineGroupFilter === 'All') return !r.group || r.group === 'All';
                        return r.group === activeRoutineGroupFilter;
                      })
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    if (daySlots.length === 0 && activeRoutineDay === 'all') return null;

                    return (
                      <div key={day} className="space-y-2.5">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <span>{DAY_LABELS[day]}</span>
                            <Badge variant="secondary" className="text-[10px] h-4.5 px-2 font-medium">
                              {daySlots.length} classes
                            </Badge>
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                            onClick={() => {
                              setEditingRoutine(null);
                              setRoutineDefaultDay(day);
                              setRoutineDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add {DAY_LABELS[day]} Slot
                          </Button>
                        </div>

                        {daySlots.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">No matching classes for {DAY_LABELS[day]}.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {daySlots.map((slot) => {
                              const sub = subjectMap.get(slot.subjectId);
                              const isLab = slot.group && slot.group !== 'All';
                              const groupText = isLab ? `Lab Group ${slot.group}` : 'Theory (All)';

                              return (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-3 group"
                                >
                                  <div className="min-w-0 flex items-center gap-3">
                                    <div
                                      className="w-3 h-11 rounded-full shrink-0 shadow-2xs"
                                      style={{ backgroundColor: sub?.color || '#3B82F6' }}
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-xs font-bold text-foreground truncate">
                                          {sub?.name || 'Unknown Subject'}
                                        </p>
                                        <Badge
                                          variant={isLab ? 'secondary' : 'outline'}
                                          className="text-[10px] px-1.5 h-4.5 font-semibold"
                                        >
                                          {groupText}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                          <Clock className="h-3 w-3 text-primary" /> {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                                        </span>
                                        {slot.room && <span>• Room #{slot.room}</span>}
                                        {slot.teacher && <span>• {slot.teacher}</span>}
                                        {slot.section && <span>• Sec {slot.section}</span>}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingRoutine(slot);
                                        setRoutineDialogOpen(true);
                                      }}
                                      title="Edit Class"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: 'routine',
                                          id: slot.id,
                                          name: `${sub?.name || 'Class'} (${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime})`,
                                        })
                                      }
                                      title="Delete Class"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 3: LAB GROUPS (Dynamic Roll Ranges)
        ═══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="labGroups" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Configurable Lab Groups & Roll Boundaries
                </CardTitle>
                <CardDescription className="text-xs">
                  Define dynamic groups (P, Q, R, S, etc.) and roll number ranges. Student devices auto-assign their group.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                  onClick={handleResetLabGroupsDefault}
                  title="Reset to standard P/Q/R defaults"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Defaults
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                  onClick={() => {
                    setEditingLabGroup(null);
                    setLabGroupDialogOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Lab Group
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Overlap alert if present */}
              {groupOverlapWarning && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{groupOverlapWarning}</span>
                </div>
              )}

              {/* Graphical Roll Spectrum Distribution Bar */}
              {labGroups.length > 0 && (
                <div className="space-y-2 p-4 rounded-2xl bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Roll Range Spectrum
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {labGroups.reduce((acc, g) => acc + (g.rollEnd - g.rollStart + 1), 0)} total students covered
                    </span>
                  </div>

                  {/* Spectrum Bar */}
                  <div className="flex h-6 w-full rounded-xl overflow-hidden border border-border/60 bg-muted/80 p-0.5 gap-0.5">
                    {labGroups.map((lg, idx) => {
                      const colors = ['bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-emerald-500', 'bg-pink-500'];
                      const count = Math.max(lg.rollEnd - lg.rollStart + 1, 1);
                      return (
                        <div
                          key={lg.group}
                          style={{ flex: count }}
                          className={`${colors[idx % colors.length]} h-full rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-2xs`}
                          title={`Group ${lg.group}: Roll ${lg.rollStart} - ${lg.rollEnd} (${count} students)`}
                        >
                          {lg.group} ({count})
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {labGroups.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs space-y-2">
                  <Users className="h-8 w-8 mx-auto opacity-30" />
                  <p>No lab groups defined. Click &quot;Add Lab Group&quot; or &quot;Reset Defaults&quot;.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {labGroups.map((lg, idx) => {
                    const badgeColors = [
                      'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
                      'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
                      'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
                      'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                      'bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400',
                    ];
                    const colorStyle = badgeColors[idx % badgeColors.length];
                    const totalStudents = lg.rollEnd - lg.rollStart + 1;

                    return (
                      <div
                        key={lg.group}
                        className="flex flex-col justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-all space-y-3.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-base border ${colorStyle} shadow-2xs`}>
                              {lg.group}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{lg.label || `Group ${lg.group}`}</h4>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                Rolls: <strong className="text-foreground">{lg.rollStart}</strong> to <strong className="text-foreground">{lg.rollEnd}</strong>
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 font-semibold">
                            {totalStudents} rolls
                          </Badge>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-border/60">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingLabGroup(lg);
                              setLabGroupDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'labGroup',
                                id: lg.group,
                                name: `Group ${lg.group} (${lg.rollStart}–${lg.rollEnd})`,
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 4: EXAM ROUTINE & SEAT PLAN
        ═══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="examRoutine" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Official Exam Notices & Room Seat Allocations
                </CardTitle>
                <CardDescription className="text-xs">
                  Authoritative exam notices, timings, room configurations, and student roll allocation plans.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Select value={examRoutineTypeFilter} onValueChange={(v) => setExamRoutineTypeFilter(v as ExamType | 'all')}>
                  <SelectTrigger className="w-36 h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exam Types</SelectItem>
                    {EXAM_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                  onClick={() => {
                    setEditingExamRoutine(null);
                    setExamRoutineDialogOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Exam Notice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {examRoutines.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs space-y-2">
                  <FileText className="h-8 w-8 mx-auto opacity-30" />
                  <p>No official exam routine published yet for Semester {selectedSemester}.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {examRoutines
                    .filter((r) => examRoutineTypeFilter === 'all' || r.examType === examRoutineTypeFilter)
                    .map((routineItem) => {
                      const totalSeats = (routineItem.seatPlan || []).reduce((acc, curr) => acc + (curr.total || 0), 0);

                      return (
                        <div
                          key={routineItem.id}
                          className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-all space-y-3.5 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <Badge variant="default" className="text-xs bg-primary/90 text-primary-foreground font-semibold px-2.5 py-0.5 rounded-md">
                                {EXAM_TYPE_OPTIONS.find((t) => t.value === routineItem.examType)?.label || routineItem.examType}
                              </Badge>
                              <span className="font-bold text-sm text-foreground">{routineItem.courseName}</span>
                              <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
                                {routineItem.courseCode}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs gap-1 rounded-lg"
                                onClick={() => {
                                  setEditingExamRoutine(routineItem);
                                  setExamRoutineDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs gap-1 rounded-lg text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'examRoutine',
                                    id: routineItem.id,
                                    name: `${routineItem.courseName} (${routineItem.date})`,
                                  })
                                }
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span><strong className="text-foreground">{routineItem.date}</strong> ({routineItem.day})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span><strong className="text-foreground">{routineItem.time}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>Rooms: <strong className="text-foreground">{routineItem.examRoom}</strong></span>
                            </div>
                          </div>

                          {/* Seat Plan Ranges Pill Summary */}
                          {routineItem.seatPlan && routineItem.seatPlan.length > 0 && (
                            <div className="pt-2 border-t border-border/60">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-primary" /> Seat Allocation Plan ({routineItem.seatPlan.length} rooms)
                                </p>
                                {totalSeats > 0 && (
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    Total exam capacity: <strong className="text-foreground">{totalSeats} seats</strong>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {routineItem.seatPlan.map((sp, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs shadow-2xs"
                                  >
                                    <span className="font-bold text-foreground">Room #{sp.room}</span>
                                    <span className="font-mono text-muted-foreground text-[11px]">Rolls {sp.rollRange}</span>
                                    {sp.total && (
                                      <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-bold">
                                        {sp.total} seats
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 5: EXAMS (Calendar / Student Countdown)
        ═══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="exams" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Shared Upcoming Exams & Deadlines
                </CardTitle>
                <CardDescription className="text-xs">
                  Exams published here appear in students&apos; personal exam tracker and countdown widgets.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 rounded-lg shadow-xs"
                onClick={() => {
                  setEditingExam(null);
                  setExamDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Exam
              </Button>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground text-xs space-y-2">
                  <GraduationCap className="h-8 w-8 mx-auto opacity-30" />
                  <p>No upcoming exams listed. Click &quot;Add Exam&quot; to publish one.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {exams.map((ex) => {
                    const sub = subjectMap.get(ex.subjectId);
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-3 group"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div
                            className="w-3 h-11 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: sub?.color || '#3B82F6' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-foreground truncate">{ex.name}</p>
                              {sub && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-4.5 font-semibold">
                                  {sub.name} ({sub.code})
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Calendar className="h-3 w-3 text-primary" /> {ex.date}
                              </span>
                              {ex.time && <span>• {ex.time}</span>}
                              {ex.room && <span>• Room #{ex.room}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingExam(ex);
                              setExamDialogOpen(true);
                            }}
                            title="Edit Exam"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'exam',
                                id: ex.id,
                                name: `${ex.name} (${ex.date})`,
                              })
                            }
                            title="Delete Exam"
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
        </TabsContent>
      </Tabs>

      {/* ── Modals & Dialogs ── */}

      {/* Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription>
              Configure curriculum details for Semester {selectedSemester}.
            </DialogDescription>
          </DialogHeader>
          <SubjectFormModal
            subject={editingSubject}
            onSubmit={handleSaveSubject}
            onCancel={() => setSubjectDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Routine Dialog (With dynamic labGroups!) */}
      <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoutine ? 'Edit Class Slot' : 'Add Class Slot'}</DialogTitle>
            <DialogDescription>
              Schedule timing, classroom, and audience for Semester {selectedSemester}.
            </DialogDescription>
          </DialogHeader>
          <RoutineFormModal
            slot={editingRoutine}
            defaultDay={routineDefaultDay}
            subjects={subjects}
            labGroups={labGroups}
            onSubmit={handleSaveRoutineSlot}
            onCancel={() => setRoutineDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Lab Group Dialog */}
      <Dialog open={labGroupDialogOpen} onOpenChange={setLabGroupDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingLabGroup ? 'Edit Lab Group' : 'Add Lab Group'}</DialogTitle>
            <DialogDescription>
              Define group label and student roll range boundaries.
            </DialogDescription>
          </DialogHeader>
          <LabGroupFormModal
            group={editingLabGroup}
            onSubmit={handleSaveLabGroup}
            onCancel={() => setLabGroupDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Exam Routine Dialog (With Seat Plan Builder) */}
      <Dialog open={examRoutineDialogOpen} onOpenChange={setExamRoutineDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingExamRoutine ? 'Edit Official Exam Slot' : 'Add Official Exam Slot'}</DialogTitle>
            <DialogDescription>
              Publish exam routine notices and room-by-room student seat plans.
            </DialogDescription>
          </DialogHeader>
          <ExamRoutineFormModal
            routine={editingExamRoutine}
            subjects={subjects}
            onSubmit={handleSaveExamRoutine}
            onCancel={() => setExamRoutineDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Exam Dialog */}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingExam ? 'Edit Exam' : 'Add Exam'}</DialogTitle>
            <DialogDescription>
              Publish an upcoming exam date to the students&apos; calendar.
            </DialogDescription>
          </DialogHeader>
          <ExamFormModal
            exam={editingExam}
            subjects={subjects}
            onSubmit={handleSaveExam}
            onCancel={() => setExamDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong className="text-foreground">{deleteTarget?.name}</strong> from your draft data. The change will take full effect after publishing to the cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground rounded-lg">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Modals Implementation ──────────────────────────────────────────────

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
  const [credits, setCredits] = useState(subject?.credits?.toString() || '3');
  const [type, setType] = useState<SubjectType>(subject?.type || 'theory');
  const [teacher, setTeacher] = useState(subject?.teacher || '');
  const [room, setRoom] = useState(subject?.room || '');
  const [color, setColor] = useState(subject?.color || '#3B82F6');

  const presetColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#6366F1'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Subject name is required.');
    if (!code.trim()) return toast.error('Subject code is required.');
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
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <Label>Subject Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operating System" className="rounded-lg text-xs" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Subject Code *</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 530205" className="rounded-lg text-xs font-mono" required />
        </div>
        <div className="space-y-1.5">
          <Label>Credits *</Label>
          <Input type="number" step="0.5" value={credits} onChange={(e) => setCredits(e.target.value)} className="rounded-lg text-xs" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => { if (v) setType(v as SubjectType); }}>
            <SelectTrigger className="rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="theory">Theory</SelectItem>
              <SelectItem value="lab">Lab</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Teacher Initials</Label>
          <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="e.g. SA / MK" className="rounded-lg text-xs" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Default Room</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 641" className="rounded-lg text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Color Palette</Label>
          <div className="flex items-center gap-1.5 pt-0.5">
            {presetColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button type="submit" className="rounded-lg">{subject ? 'Update Subject' : 'Add Subject'}</Button>
      </DialogFooter>
    </form>
  );
}

function RoutineFormModal({
  slot,
  defaultDay,
  subjects,
  labGroups,
  onSubmit,
  onCancel,
}: {
  slot: RoutineSlot | null;
  defaultDay: DayOfWeek;
  subjects: Subject[];
  labGroups: LabGroup[];
  onSubmit: (data: Partial<RoutineSlot>) => void;
  onCancel: () => void;
}) {
  const [subjectId, setSubjectId] = useState(slot?.subjectId || subjects[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(slot?.dayOfWeek || defaultDay);
  const [startTime, setStartTime] = useState(slot?.startTime || '10:40');
  const [endTime, setEndTime] = useState(slot?.endTime || '12:00');
  const [room, setRoom] = useState(slot?.room || '641');
  const [teacher, setTeacher] = useState(slot?.teacher || '');
  const [group, setGroup] = useState(slot?.group || 'All');
  const [section, setSection] = useState(slot?.section || 'B');

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
      group: group || undefined,
      section: section.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <Label>Subject *</Label>
        <Select value={subjectId} onValueChange={(v) => { if (v) setSubjectId(v); }}>
          <SelectTrigger className="rounded-lg text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
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
        <div className="space-y-1.5">
          <Label>Day *</Label>
          <Select value={dayOfWeek} onValueChange={(v) => { if (v) setDayOfWeek(v as DayOfWeek); }}>
            <SelectTrigger className="rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Audience / Lab Group</Label>
          <Select value={group} onValueChange={(val) => { if (val) setGroup(val); }}>
            <SelectTrigger className="rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All / Theory (Everyone)</SelectItem>
              {labGroups.map((g) => (
                <SelectItem key={g.group} value={g.group}>
                  {g.label || `Group ${g.group} (Roll ${g.rollStart}–${g.rollEnd})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start Time *</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-lg text-xs" required />
        </div>
        <div className="space-y-1.5">
          <Label>End Time *</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-lg text-xs" required />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Room</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 641, 533" className="rounded-lg text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. B" className="rounded-lg text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Teacher Initials</Label>
          <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="e.g. SP / MK" className="rounded-lg text-xs" />
        </div>
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button type="submit" className="rounded-lg">{slot ? 'Update Class' : 'Add Class'}</Button>
      </DialogFooter>
    </form>
  );
}

function LabGroupFormModal({
  group,
  onSubmit,
  onCancel,
}: {
  group: LabGroup | null;
  onSubmit: (data: LabGroup) => void;
  onCancel: () => void;
}) {
  const [groupKey, setGroupKey] = useState(group?.group || 'P');
  const [rollStart, setRollStart] = useState(group?.rollStart?.toString() || '2');
  const [rollEnd, setRollEnd] = useState(group?.rollEnd?.toString() || '65');
  const [label, setLabel] = useState(group?.label || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = groupKey.trim().toUpperCase();
    const start = parseInt(rollStart, 10);
    const end = parseInt(rollEnd, 10);

    if (!cleanKey) return toast.error('Group identifier is required.');
    if (isNaN(start) || isNaN(end) || start > end) {
      return toast.error('Please enter a valid roll range (Start Roll <= End Roll).');
    }

    const autoLabel = label.trim() || `Group ${cleanKey} (Roll ${start}–${end})`;

    onSubmit({
      group: cleanKey,
      rollStart: start,
      rollEnd: end,
      label: autoLabel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <Label>Group Identifier *</Label>
        <Input
          value={groupKey}
          onChange={(e) => setGroupKey(e.target.value)}
          placeholder="e.g. P, Q, R, S"
          maxLength={4}
          className="rounded-lg text-xs uppercase font-bold"
          required
        />
        <p className="text-[11px] text-muted-foreground">Short group code (e.g. P, Q, R, or A1, B2).</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Roll Start *</Label>
          <Input
            type="number"
            value={rollStart}
            onChange={(e) => setRollStart(e.target.value)}
            placeholder="e.g. 2"
            className="rounded-lg text-xs"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Roll End *</Label>
          <Input
            type="number"
            value={rollEnd}
            onChange={(e) => setRollEnd(e.target.value)}
            placeholder="e.g. 65"
            className="rounded-lg text-xs"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Display Label (Optional)</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`e.g. Group ${groupKey.toUpperCase()} (Roll ${rollStart}–${rollEnd})`}
          className="rounded-lg text-xs"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button type="submit" className="rounded-lg">{group ? 'Update Group' : 'Add Group'}</Button>
      </DialogFooter>
    </form>
  );
}

function ExamRoutineFormModal({
  routine,
  subjects,
  onSubmit,
  onCancel,
}: {
  routine: ExamRoutineItem | null;
  subjects: Subject[];
  onSubmit: (data: ExamRoutineItem) => void;
  onCancel: () => void;
}) {
  const [examType, setExamType] = useState<ExamType>(routine?.examType || 'in_course');
  const [courseCode, setCourseCode] = useState(routine?.courseCode || subjects[0]?.code || '530201');
  const [courseName, setCourseName] = useState(
    routine?.courseName || subjects.find((s) => s.code === (routine?.courseCode || subjects[0]?.code))?.name || 'Peripheral and Interfacing'
  );
  const [date, setDate] = useState(routine?.date || '2026-10-06');
  const [day, setDay] = useState(routine?.day || 'Tuesday');
  const [time, setTime] = useState(routine?.time || '12:30 pm – 2:30 pm');
  const [examRoom, setExamRoom] = useState(routine?.examRoom || '641, 642 and 645');
  const [session, setSession] = useState(routine?.session || '2022-2023');
  const [part, setPart] = useState(routine?.part || 'Part-III');
  const [instructions, setInstructions] = useState(
    routine?.instructions ||
      'Students are advised to occupy their respective seats at least 15 minutes before the exam commences.'
  );

  // Seat Plan Ranges state
  const [seatPlan, setSeatPlan] = useState<SeatPlanRange[]>(
    routine?.seatPlan && routine.seatPlan.length > 0
      ? routine.seatPlan
      : [
          { room: '641', rollRange: '2-60', total: 41 },
          { room: '642', rollRange: '64-126', total: 42 },
          { room: '645', rollRange: '127-193', total: 41 },
        ]
  );

  const handleSubjectChange = (code: string) => {
    setCourseCode(code);
    const sub = subjects.find((s) => s.code === code);
    if (sub) setCourseName(sub.name);
  };

  const handleAddSeatRow = () => {
    setSeatPlan((prev) => [...prev, { room: '641', rollRange: '2-60', total: 40 }]);
  };

  const handleUpdateSeatRow = (index: number, field: keyof SeatPlanRange, val: string | number) => {
    setSeatPlan((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const handleRemoveSeatRow = (index: number) => {
    setSeatPlan((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim()) return toast.error('Course code is required.');
    if (!courseName.trim()) return toast.error('Course name is required.');
    if (!date) return toast.error('Date is required.');

    onSubmit({
      id: routine?.id || generateId(),
      semesterId: routine?.semesterId || 'semester-5',
      examType,
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      date,
      day: day.trim(),
      time: time.trim(),
      examRoom: examRoom.trim(),
      session: session.trim(),
      part: part.trim(),
      instructions: instructions.trim(),
      seatPlan: seatPlan.filter((s) => s.room.trim() && s.rollRange.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Exam Type *</Label>
          <Select value={examType} onValueChange={(v) => { if (v) setExamType(v as ExamType); }}>
            <SelectTrigger className="rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXAM_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Quick Select Subject</Label>
          <Select value={courseCode} onValueChange={(v) => { if (v) handleSubjectChange(v); }}>
            <SelectTrigger className="rounded-lg text-xs"><SelectValue placeholder="Pick subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.code}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Course Code *</Label>
          <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. 530201" className="rounded-lg text-xs font-mono" required />
        </div>
        <div className="space-y-1.5">
          <Label>Course Name *</Label>
          <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Peripheral and Interfacing" className="rounded-lg text-xs" required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg text-xs" required />
        </div>
        <div className="space-y-1.5">
          <Label>Day Name *</Label>
          <Input value={day} onChange={(e) => setDay(e.target.value)} placeholder="e.g. Tuesday" className="rounded-lg text-xs" required />
        </div>
        <div className="space-y-1.5">
          <Label>Exam Timing *</Label>
          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 12:30 pm – 2:30 pm" className="rounded-lg text-xs" required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Exam Rooms</Label>
          <Input value={examRoom} onChange={(e) => setExamRoom(e.target.value)} placeholder="e.g. 641, 642 and 645" className="rounded-lg text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Academic Session</Label>
          <Input value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. 2022-2023" className="rounded-lg text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Part / Level</Label>
          <Input value={part} onChange={(e) => setPart(e.target.value)} placeholder="e.g. Part-III" className="rounded-lg text-xs" />
        </div>
      </div>

      {/* Seat Plan Builder */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Room Seat Allocation Plan
          </Label>
          <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] gap-1 rounded-md" onClick={handleAddSeatRow}>
            <Plus className="h-3 w-3" /> Add Room Range
          </Button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {seatPlan.map((sp, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border border-border/70 bg-muted/30">
              <div className="w-24">
                <Input
                  value={sp.room}
                  onChange={(e) => handleUpdateSeatRow(idx, 'room', e.target.value)}
                  placeholder="Room (641)"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={sp.rollRange}
                  onChange={(e) => handleUpdateSeatRow(idx, 'rollRange', e.target.value)}
                  placeholder="Roll range (2-60)"
                  className="h-8 text-xs font-mono rounded-lg"
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  value={sp.total?.toString() || ''}
                  onChange={(e) => handleUpdateSeatRow(idx, 'total', parseInt(e.target.value, 10) || 0)}
                  placeholder="Seats"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 rounded-lg"
                onClick={() => handleRemoveSeatRow(idx)}
                disabled={seatPlan.length === 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notice Instructions / Notes</Label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Classes will remain suspended during exam..."
          rows={2}
          className="text-xs rounded-lg"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button type="submit" className="rounded-lg">{routine ? 'Update Exam Notice' : 'Publish Notice'}</Button>
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
  const [room, setRoom] = useState(exam?.room || '641');
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
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <Label>Exam Title *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Midterm Examination" className="rounded-lg text-xs" required />
      </div>
      <div className="space-y-1.5">
        <Label>Subject *</Label>
        <Select value={subjectId} onValueChange={(v) => { if (v) setSubjectId(v); }}>
          <SelectTrigger className="rounded-lg text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
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
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg text-xs" required />
        </div>
        <div className="space-y-1.5">
          <Label>Time</Label>
          <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 10:00 AM" className="rounded-lg text-xs" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Room</Label>
        <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 641" className="rounded-lg text-xs" />
      </div>
      <div className="space-y-1.5">
        <Label>Notes / Syllabus</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Chapters 1-4" className="rounded-lg text-xs" />
      </div>
      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-lg">Cancel</Button>
        <Button type="submit" className="rounded-lg">{exam ? 'Update Exam' : 'Add Exam'}</Button>
      </DialogFooter>
    </form>
  );
}
