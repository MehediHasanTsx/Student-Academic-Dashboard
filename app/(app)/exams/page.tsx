'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { examRoutineService } from '@/lib/services/exam-routine.service';
import { examService } from '@/lib/services/exam.service';
import { formatDate } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { examSchema, type ExamFormData } from '@/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  GraduationCap,
  Clock,
  RefreshCw,
  Calendar,
  Search,
  MapPin,
  Building,
  Info,
  Users,
  CheckCircle2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Exam, ExamRoutineItem, ExamType, SeatPlanRange } from '@/types/database';
import { useAuth } from '@/components/providers/auth-provider';

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  in_course: 'In-Course Examination',
  semester_final: 'Semester Final Examination',
  nu_final: 'National University (NU) Final Examination',
};

export default function ExamsPage() {
  const { profile } = useProfile();
  const { isAdmin } = useAuth();

  const currentSem = profile?.currentSemester ?? 5;
  const [selectedSemester, setSelectedSemester] = useState<number>(currentSem);
  const semesterId = `semester-${selectedSemester}`;

  const { subjects } = useSubjects(semesterId);

  // Exam Routine state
  const [activeTab, setActiveTab] = useState<'routine' | 'countdown' | 'custom'>('routine');
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('in_course');
  const [examRoutines, setExamRoutines] = useState<ExamRoutineItem[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(true);

  // Seat finder search
  const [customSearchRoll, setCustomSearchRoll] = useState<string | null>(null);
  const searchRoll = customSearchRoll !== null ? customSearchRoll : (profile?.rollNumber || '');
  const setSearchRoll = (val: string) => setCustomSearchRoll(val);

  // Custom exams state
  const [customExams, setCustomExams] = useState<Exam[]>([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [deleteCustomTarget, setDeleteCustomTarget] = useState<Exam | null>(null);

  // Admin / Routine edit modal
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Partial<ExamRoutineItem> | null>(null);
  const [deleteRoutineTarget, setDeleteRoutineTarget] = useState<ExamRoutineItem | null>(null);

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Load Exam Routines
  const loadExamRoutines = async () => {
    setLoadingRoutines(true);
    try {
      const items = await examRoutineService.getExamRoutines(semesterId, selectedExamType);
      setExamRoutines(items);
    } catch (err) {
      console.error('Failed to load exam routines:', err);
    } finally {
      setLoadingRoutines(false);
    }
  };

  // Load Custom Personal Exams
  const loadCustomExams = async () => {
    try {
      const data = await examService.getBySemester(semesterId);
      setCustomExams(data.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      console.error('Failed to load custom exams:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching from IndexedDB
    void loadExamRoutines();
    void loadCustomExams();
  }, [semesterId, selectedExamType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync / Reset Routines
  const handleResetToOfficial = async () => {
    try {
      setIsSyncing(true);
      await examRoutineService.resetToOfficialRoutine(semesterId);
      await loadExamRoutines();
      toast.success('Official routine restored successfully.');
    } catch {
      toast.error('Failed to reset routine.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Roll match logic
  const rollSeatMatch = useMemo(() => {
    if (!searchRoll.trim() || examRoutines.length === 0) return null;
    // Look at first routine with seat plan
    const routineWithSeatPlan = examRoutines.find((r) => r.seatPlan && r.seatPlan.length > 0);
    if (!routineWithSeatPlan || !routineWithSeatPlan.seatPlan) return null;
    const match = examRoutineService.findStudentSeat(searchRoll, routineWithSeatPlan.seatPlan);
    return match ? { ...match, routine: routineWithSeatPlan } : null;
  }, [searchRoll, examRoutines]);

  // Combined upcoming list for countdown tab
  const today = new Date().toISOString().split('T')[0];
  const upcomingRoutineExams = useMemo(() => {
    return examRoutines
      .filter((r) => r.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [examRoutines, today]);

  // Distinct seat plan summary from routines
  const currentSeatPlan = useMemo<SeatPlanRange[]>(() => {
    const routineWithPlan = examRoutines.find((r) => r.seatPlan && r.seatPlan.length > 0);
    return routineWithPlan?.seatPlan || [];
  }, [examRoutines]);

  const totalSeats = useMemo(() => {
    return currentSeatPlan.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [currentSeatPlan]);

  const noticeInstruction = useMemo(() => {
    return (
      examRoutines[0]?.instructions ||
      'Students are advised to occupy their respective seats at least 15 minutes before the exam commences.'
    );
  }, [examRoutines]);

  const noticeSession = examRoutines[0]?.session || '2022-2023';
  const noticePart = examRoutines[0]?.part || `Part-${selectedSemester <= 2 ? 'I' : selectedSemester <= 4 ? 'II' : selectedSemester <= 6 ? 'III' : 'IV'}`;

  // Handle Save Routine Slot (Admin/Edit)
  const handleSaveRoutineSlot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRoutine) return;

    try {
      await examRoutineService.saveExamRoutine({
        semesterId,
        examType: selectedExamType,
        courseCode: editingRoutine.courseCode || '',
        courseName: editingRoutine.courseName || '',
        date: editingRoutine.date || today,
        day: editingRoutine.day || 'Monday',
        time: editingRoutine.time || '12:30 pm – 2:30 pm',
        examRoom: editingRoutine.examRoom || '641, 642 and 645',
        session: editingRoutine.session || noticeSession,
        part: editingRoutine.part || noticePart,
        instructions: editingRoutine.instructions || noticeInstruction,
        seatPlan: editingRoutine.seatPlan || currentSeatPlan,
        id: editingRoutine.id,
      });

      toast.success('Exam routine slot saved.');
      setRoutineModalOpen(false);
      setEditingRoutine(null);
      await loadExamRoutines();
    } catch {
      toast.error('Failed to save exam routine slot.');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Exam Routine & Schedule</h1>
            <Badge variant="secondary" className="text-xs capitalize font-semibold">
              Sem {selectedSemester}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Official routines for In-Course, Semester Final, and NU Final examinations.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={String(selectedSemester)}
            onValueChange={(val) => setSelectedSemester(Number(val))}
          >
            <SelectTrigger className="w-35 h-9 text-xs">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <SelectItem key={num} value={String(num)} className="text-xs">
                  Semester {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isAdmin && (
            <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-1 px-2.5">
              Official Department Routine · Published by Admin
            </Badge>
          )}

          {isAdmin && (
            <>
              {selectedSemester === 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToOfficial}
                  disabled={isSyncing}
                  className="text-xs gap-1.5"
                  title="Admin: Reset to default DCC notice template"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Template
                </Button>
              )}

              <Button
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => {
                  setEditingRoutine({
                    semesterId,
                    examType: selectedExamType,
                    courseCode: '',
                    courseName: '',
                    date: today,
                    day: 'Monday',
                    time: '12:30 pm – 2:30 pm',
                    examRoom: '641, 642 and 645',
                    session: noticeSession,
                    part: noticePart,
                    instructions: noticeInstruction,
                    seatPlan: currentSeatPlan,
                  });
                  setRoutineModalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Exam Schedule
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          if (val === 'routine' || val === 'countdown' || val === 'custom') {
            setActiveTab(val);
          }
        }}
      >
        <TabsList className="grid grid-cols-3 max-w-md w-full">
          <TabsTrigger value="routine" className="text-xs font-medium">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Official Notice
          </TabsTrigger>
          <TabsTrigger value="countdown" className="text-xs font-medium">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Countdown ({upcomingRoutineExams.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs font-medium">
            <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
            Study Tracker
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: OFFICIAL NOTICE & ROUTINE ── */}
        <TabsContent value="routine" className="space-y-6 pt-4">
          {/* Exam Type Selector Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Exam Type:
              </span>
              <div className="flex items-center gap-1.5">
                {(['in_course', 'semester_final', 'nu_final'] as ExamType[]).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={selectedExamType === type ? 'default' : 'outline'}
                    onClick={() => setSelectedExamType(type)}
                    className="text-xs capitalize h-8"
                  >
                    {type.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Roll Room Checker Bar */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Enter your roll (e.g. 52)..."
                  value={searchRoll}
                  onChange={(e) => setSearchRoll(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
              {searchRoll && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs px-2"
                  onClick={() => setSearchRoll('')}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Student Seat Match Banner */}
          {searchRoll.trim() && (
            <Card
              className={
                rollSeatMatch
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-amber-500/40 bg-amber-500/10'
              }
            >
              <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  {rollSeatMatch ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div>
                    {rollSeatMatch ? (
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Roll #{searchRoll} is assigned to{' '}
                        <span className="font-bold underline text-emerald-800 dark:text-emerald-100">
                          Room {rollSeatMatch.room}
                        </span>{' '}
                        (Roll range: {rollSeatMatch.rollRange})
                      </p>
                    ) : (
                      <p className="text-amber-900 dark:text-amber-200">
                        Roll #{searchRoll} not found in the seat plan for {EXAM_TYPE_LABELS[selectedExamType]}.
                        Please verify your roll number.
                      </p>
                    )}
                  </div>
                </div>
                {rollSeatMatch && (
                  <Badge variant="outline" className="border-emerald-500/50 bg-background text-emerald-700 dark:text-emerald-300 w-fit">
                    Room {rollSeatMatch.room}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Official Dhaka City College Notice Document Replica */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* College Header */}
            <div className="p-6 md:p-8 border-b border-border bg-linear-to-b from-muted/50 to-transparent text-center space-y-2">
              <div className="flex justify-center mb-1">
                <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/10 text-primary">
                  <Building className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase text-foreground">
                DHAKA CITY COLLEGE
              </h2>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Department of Computer Science and Engineering
              </p>
              <div className="pt-2">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm font-bold text-primary tracking-wide">
                  {EXAM_TYPE_LABELS[selectedExamType]}, 2026
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs text-muted-foreground">
                <span>
                  <strong>Session:</strong> {noticeSession}
                </span>
                <span>•</span>
                <span>
                  <strong>Part:</strong> {noticePart}
                </span>
                <span>•</span>
                <span>
                  <strong>Semester:</strong> Semester {selectedSemester}
                </span>
              </div>
            </div>

            {/* Suspended Class Announcement Box */}
            {noticeInstruction && (
              <div className="px-6 py-3.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Notice:</strong> {noticeInstruction}
                </p>
              </div>
            )}

            {/* Routine Schedule Table */}
            <div className="p-4 md:p-6 space-y-6">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs md:text-sm border-collapse min-w-150">
                  <thead>
                    <tr className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                      <th className="py-3 px-4 w-32.5">Date</th>
                      <th className="py-3 px-4 w-27.5">Day</th>
                      <th className="py-3 px-4 w-40">Time</th>
                      <th className="py-3 px-4">Course Title & Code</th>
                      <th className="py-3 px-4 w-37.5">Exam Room</th>
                      {isAdmin && <th className="py-3 px-4 w-17.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingRoutines ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                          Loading exam schedule...
                        </td>
                      </tr>
                    ) : examRoutines.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                          No routine entries found for this semester & exam type.
                          {isAdmin && (
                            <p className="mt-2 text-xs text-primary">
                              Click &quot;Add Exam Slot&quot; above to create one.
                            </p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      examRoutines.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                            {item.day}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                            {item.time}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">
                              {item.courseName}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              Course Code: {item.courseCode}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                              <MapPin className="h-3 w-3 text-primary" />
                              {item.examRoom}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteRoutineTarget(item)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Official Seat Plan Section */}
              {currentSeatPlan.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Seat Plan Breakdown
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Total Candidates: <strong>{totalSeats}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currentSeatPlan.map((plan, idx) => {
                      const isUserRoom = rollSeatMatch?.room === plan.room;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-lg border text-xs transition-all ${
                            isUserRoom
                              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                              : 'border-border bg-muted/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-foreground flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              Room {plan.room}
                            </span>
                            {isUserRoom && (
                              <Badge className="text-[10px] bg-primary text-primary-foreground">
                                Your Room
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            <strong>Roll:</strong> {plan.rollRange}
                          </div>
                          {plan.total !== undefined && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Total Students: {plan.total}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: COUNTDOWN & SCHEDULE ── */}
        <TabsContent value="countdown" className="space-y-4 pt-4">
          {upcomingRoutineExams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No upcoming exams scheduled for {EXAM_TYPE_LABELS[selectedExamType]}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingRoutineExams.map((item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.date).getTime() - new Date(today).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <Card key={item.id} className="relative overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={daysLeft <= 2 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          {daysLeft === 0 ? 'Today' : `${daysLeft} days remaining`}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.courseCode}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold mt-2">
                        {item.courseName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(item.date)} ({item.day})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 text-xs space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground border-t border-border pt-2">
                        <span>Time:</span>
                        <span className="font-semibold text-foreground">{item.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Exam Rooms:</span>
                        <span className="font-semibold text-foreground">{item.examRoom}</span>
                      </div>
                      {rollSeatMatch && (
                        <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/20 text-primary font-medium text-xs flex items-center justify-between">
                          <span>Your Room:</span>
                          <span className="font-bold">Room {rollSeatMatch.room}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: CUSTOM STUDY TRACKER ── */}
        <TabsContent value="custom" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Personal study exams, mock tests, or quiz reminders.
            </p>
            <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
              <Button size="sm" onClick={() => setCustomDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Study Exam
              </Button>
              <DialogContent>
                <CustomExamForm
                  subjects={subjects}
                  onSubmit={async (data) => {
                    await examService.create(semesterId, data);
                    toast.success('Study exam added.');
                    setCustomDialogOpen(false);
                    await loadCustomExams();
                  }}
                  onCancel={() => setCustomDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {customExams.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-xs">
                    No custom study exams scheduled.
                  </p>
                </CardContent>
              </Card>
            ) : (
              customExams.map((e) => {
                const subject = subjects.find((s) => s.id === e.subjectId);
                const daysLeft = Math.ceil(
                  (new Date(e.date).getTime() - new Date(today).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <Card key={e.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subject?.name} · {formatDate(e.date)}
                          {e.time ? ` · ${e.time}` : ''}
                          {e.room ? ` · Room ${e.room}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            daysLeft <= 3
                              ? 'destructive'
                              : daysLeft <= 7
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteCustomTarget(e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Admin Edit Routine Slot Modal */}
      {routineModalOpen && editingRoutine && (
        <Dialog open={routineModalOpen} onOpenChange={setRoutineModalOpen}>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSaveRoutineSlot}>
              <DialogHeader>
                <DialogTitle>
                  {editingRoutine.id ? 'Edit Routine Slot' : 'Add Routine Slot'}
                </DialogTitle>
                <DialogDescription>
                  Configure official exam date, room, and seat plan for {EXAM_TYPE_LABELS[selectedExamType]}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Course Code *</Label>
                    <Input
                      value={editingRoutine.courseCode || ''}
                      onChange={(e) =>
                        setEditingRoutine({ ...editingRoutine, courseCode: e.target.value })
                      }
                      placeholder="e.g. 530201"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Day *</Label>
                    <Input
                      value={editingRoutine.day || ''}
                      onChange={(e) =>
                        setEditingRoutine({ ...editingRoutine, day: e.target.value })
                      }
                      placeholder="e.g. Tuesday"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Course Name *</Label>
                  <Input
                    value={editingRoutine.courseName || ''}
                    onChange={(e) =>
                      setEditingRoutine({ ...editingRoutine, courseName: e.target.value })
                    }
                    placeholder="e.g. Peripheral and Interfacing"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Date *</Label>
                    <Input
                      type="date"
                      value={editingRoutine.date || ''}
                      onChange={(e) =>
                        setEditingRoutine({ ...editingRoutine, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Time *</Label>
                    <Input
                      value={editingRoutine.time || ''}
                      onChange={(e) =>
                        setEditingRoutine({ ...editingRoutine, time: e.target.value })
                      }
                      placeholder="12:30 pm – 2:30 pm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Exam Rooms *</Label>
                  <Input
                    value={editingRoutine.examRoom || ''}
                    onChange={(e) =>
                      setEditingRoutine({ ...editingRoutine, examRoom: e.target.value })
                    }
                    placeholder="641, 642 and 645"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs">Instructions / Suspended Classes Note</Label>
                  <Textarea
                    rows={2}
                    value={editingRoutine.instructions || ''}
                    onChange={(e) =>
                      setEditingRoutine({ ...editingRoutine, instructions: e.target.value })
                    }
                    placeholder="The classes will remain suspended..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRoutineModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Slot</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Delete Routine Slot Dialog */}
      <AlertDialog
        open={!!deleteRoutineTarget}
        onOpenChange={(open) => !open && setDeleteRoutineTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete routine item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{deleteRoutineTarget?.courseName}&quot; from the routine?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteRoutineTarget) {
                  await examRoutineService.deleteExamRoutine(deleteRoutineTarget.id);
                  toast.success('Routine slot deleted.');
                  setDeleteRoutineTarget(null);
                  await loadExamRoutines();
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Custom Exam Dialog */}
      <AlertDialog
        open={!!deleteCustomTarget}
        onOpenChange={(open) => !open && setDeleteCustomTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom exam?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteCustomTarget) {
                  await examService.delete(deleteCustomTarget.id);
                  toast.success('Deleted.');
                  setDeleteCustomTarget(null);
                  await loadCustomExams();
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CustomExamForm({
  subjects,
  onSubmit,
  onCancel,
}: {
  subjects: { id: string; name: string }[];
  onSubmit: (data: ExamFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: { name: '', subjectId: '', date: '', time: '', room: '', notes: '' },
  });

  const doSubmit = async (data: ExamFormData) => {
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
        <DialogTitle>Add Study Exam</DialogTitle>
        <DialogDescription>Schedule an upcoming personal test or study exam.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 text-xs">
        <div className="space-y-2">
          <Label>Exam Name *</Label>
          <Input placeholder="e.g. Mid-term Quiz 1" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Subject *</Label>
          <Select
            value={watch('subjectId')}
            onValueChange={(v) => {
              if (v) setValue('subjectId', v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input type="time" {...register('time')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Room</Label>
          <Input placeholder="Room number" {...register('room')} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea placeholder="Optional notes" {...register('notes')} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Add Exam'}
        </Button>
      </DialogFooter>
    </form>
  );
}
