'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { resultsService } from '@/lib/services/results.service';
import { gpaService, type SemesterGpaResult, type CgpaResult } from '@/lib/services/gpa.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trophy,
  Award,
  Sparkles,
  Medal,
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Edit2,
  CheckCircle2,
  HelpCircle,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  StudentResultRecord,
  ScholarshipConfig,
  StudentScholarshipStanding,
  Result,
  GradeScale,
} from '@/types/database';
import { useAuth } from '@/components/providers/auth-provider';

export default function ResultsPage() {
  const { profile } = useProfile();
  const { isAdmin } = useAuth();

  const currentSem = profile?.currentSemester ?? 5;
  const [selectedSemester, setSelectedSemester] = useState<number>(currentSem);
  const semesterId = `semester-${selectedSemester}`;

  const { subjects } = useSubjects(semesterId);

  // Results State
  const [studentResults, setStudentResults] = useState<StudentResultRecord[]>([]);
  const [standings, setStandings] = useState<StudentScholarshipStanding[]>([]);
  const [scholarshipConfig, setScholarshipConfig] = useState<ScholarshipConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // NU Final GPA state
  const [nuResults, setNuResults] = useState<Result[]>([]);
  const [semesterGpa, setSemesterGpa] = useState<SemesterGpaResult | null>(null);
  const [cgpaResult, setCgpaResult] = useState<CgpaResult | null>(null);
  const [gradeScale, setGradeScale] = useState<GradeScale[]>([]);

  // Dialog state for marks entry
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<StudentResultRecord> | null>(null);

  // Dialog for Scholarship Config (Admin)
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<Partial<ScholarshipConfig>>({});

  // Active Tab
  const [activeTab, setActiveTab] = useState<'standings' | 'incourse' | 'semester_final' | 'nu_final'>('standings');

  const studentId = profile?.studentId || 'current-user';
  const studentName = profile?.fullName || 'My Account';
  const rollNumber = profile?.rollNumber || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const [results, currentStandings, config, nuRes, scale, cgpa] = await Promise.all([
        resultsService.getResultsBySemester(semesterId),
        resultsService.calculateScholarshipStandings(semesterId),
        resultsService.getScholarshipConfig(),
        gpaService.getResultsBySemester(semesterId),
        gpaService.getGradeScale(),
        gpaService.calculateCgpa(),
      ]);

      setStudentResults(results);
      setStandings(currentStandings);
      setScholarshipConfig(config);
      setNuResults(nuRes);
      setSemesterGpa(gpaService.calculateSemesterGpa(nuRes));
      setGradeScale(scale);
      setCgpaResult(cgpa);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching from IndexedDB
    void loadData();
  }, [semesterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // User's own results for current semester
  const myResults = useMemo(() => {
    return studentResults.filter(
      (r) => r.studentId === studentId || r.rollNumber === rollNumber
    );
  }, [studentResults, studentId, rollNumber]);

  // User's standing
  const myStanding = useMemo(() => {
    return standings.find(
      (s) => s.studentId === studentId || (rollNumber && s.rollNumber === rollNumber)
    );
  }, [standings, studentId, rollNumber]);

  // In-Course Totals for current student
  const inCourseStats = useMemo(() => {
    let obtained = 0;
    let max = 0;
    for (const r of myResults) {
      if (r.inCourseMarks !== undefined && r.inCourseMarks !== null) {
        obtained += Number(r.inCourseMarks);
        max += Number(r.inCourseMaxMarks) || 20;
      }
    }
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    return { obtained, max, pct };
  }, [myResults]);

  // Semester Final Totals for current student
  const semesterFinalStats = useMemo(() => {
    let obtained = 0;
    let max = 0;
    for (const r of myResults) {
      if (r.semesterFinalMarks !== undefined && r.semesterFinalMarks !== null) {
        obtained += Number(r.semesterFinalMarks);
        max += Number(r.semesterFinalMaxMarks) || 80;
      }
    }
    const pct = max > 0 ? (obtained / max) * 100 : 0;
    return { obtained, max, pct };
  }, [myResults]);

  // Save marks record
  const handleSaveMarks = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecord || !editingRecord.subjectCode) return;

    try {
      await resultsService.saveResult({
        semesterId,
        studentId: editingRecord.studentId || studentId,
        studentName: editingRecord.studentName || studentName,
        rollNumber: editingRecord.rollNumber || rollNumber,
        subjectCode: editingRecord.subjectCode,
        subjectName: editingRecord.subjectName || '',
        inCourseMarks:
          editingRecord.inCourseMarks !== undefined && editingRecord.inCourseMarks !== null
            ? Number(editingRecord.inCourseMarks)
            : undefined,
        inCourseMaxMarks: Number(editingRecord.inCourseMaxMarks) || 20,
        semesterFinalMarks:
          editingRecord.semesterFinalMarks !== undefined && editingRecord.semesterFinalMarks !== null
            ? Number(editingRecord.semesterFinalMarks)
            : undefined,
        semesterFinalMaxMarks: Number(editingRecord.semesterFinalMaxMarks) || 80,
        nuGrade: editingRecord.nuGrade,
        nuGradePoint: editingRecord.nuGradePoint,
        remarks: editingRecord.remarks,
        id: editingRecord.id,
      });

      // If nuGrade is given and matched with subject, also update official GPA Result table
      if (editingRecord.nuGrade && editingRecord.nuGradePoint !== undefined) {
        const matchedSub = subjects.find((s) => s.code === editingRecord.subjectCode);
        if (matchedSub) {
          await gpaService.saveResult(semesterId, {
            subjectId: matchedSub.id,
            grade: editingRecord.nuGrade,
            gradePoint: editingRecord.nuGradePoint,
            credits: matchedSub.credits,
          });
        }
      }

      toast.success('Marks saved successfully.');
      setEntryDialogOpen(false);
      setEditingRecord(null);
      await loadData();
    } catch {
      toast.error('Failed to save marks.');
    }
  };

  // Save scholarship config
  const handleSaveConfig = async () => {
    try {
      await resultsService.updateScholarshipConfig(tempConfig);
      toast.success('Scholarship rules updated.');
      setConfigDialogOpen(false);
      await loadData();
    } catch {
      toast.error('Failed to update scholarship config.');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Academic Results & Scholarship</h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              Sem {selectedSemester}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            In-Course, Semester Final, Scholarship Standings, and National University (NU) Final CGPA.
          </p>
        </div>

        {/* Global Selectors & Actions */}
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

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempConfig({
                  inCourseWeight: scholarshipConfig?.inCourseWeight ?? 30,
                  semesterFinalWeight: scholarshipConfig?.semesterFinalWeight ?? 70,
                  topCount: scholarshipConfig?.topCount ?? 5,
                  topStudentsCount: scholarshipConfig?.topStudentsCount ?? scholarshipConfig?.topCount ?? 5,
                  discountPercent: scholarshipConfig?.discountPercent ?? 50,
                  scholarshipPercentage: scholarshipConfig?.scholarshipPercentage ?? scholarshipConfig?.discountPercent ?? 50,
                });
                setConfigDialogOpen(true);
              }}
              className="text-xs gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Scholarship Rules
            </Button>
          )}

          <Button
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => {
              setEditingRecord({
                semesterId,
                studentId,
                studentName,
                rollNumber,
                subjectCode: subjects[0]?.code || '',
                subjectName: subjects[0]?.name || '',
                inCourseMaxMarks: 20,
                semesterFinalMaxMarks: 80,
              });
              setEntryDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Record Marks
          </Button>
        </div>
      </div>

      {/* High-Level Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scholarship Status Card */}
        <Card
          className={
            myStanding?.isEligibleForScholarship
              ? 'border-amber-500/50 bg-linear-to-br from-amber-500/15 to-amber-500/5'
              : 'border-border'
          }
        >
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Scholarship Standing</span>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {myStanding ? (
                myStanding.isEligibleForScholarship ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    Rank #{myStanding.rank} (50% Off)
                  </span>
                ) : (
                  <span>Rank #{myStanding.rank}</span>
                )
              ) : (
                <span className="text-muted-foreground text-sm font-normal">No marks recorded</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {myStanding?.isEligibleForScholarship ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Qualified for 50% tuition waiver!
              </span>
            ) : (
              <span>Top 5 students receive 50% semester fee waiver</span>
            )}
          </CardContent>
        </Card>

        {/* Combined Academic Score */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Combined Score</span>
              <Percent className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {myStanding ? `${myStanding.combinedScore}%` : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {scholarshipConfig?.inCourseWeight || 30}% In-Course + {scholarshipConfig?.semesterFinalWeight || 70}% Sem Final
          </CardContent>
        </Card>

        {/* Official Semester GPA */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>NU Semester GPA</span>
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {semesterGpa && semesterGpa.totalCredits > 0
                ? semesterGpa.gpa.toFixed(2)
                : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {semesterGpa ? `${semesterGpa.earnedCredits} credits earned` : 'NU Final only'}
          </CardContent>
        </Card>

        {/* Overall CGPA */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Cumulative CGPA</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {cgpaResult && cgpaResult.totalCredits > 0
                ? cgpaResult.cgpa.toFixed(2)
                : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            {cgpaResult ? `${cgpaResult.totalCredits} total credits` : 'Across all semesters'}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v === 'standings' || v === 'incourse' || v === 'semester_final' || v === 'nu_final') {
            setActiveTab(v);
          }
        }}
      >
        <TabsList className="grid grid-cols-4 max-w-xl w-full">
          <TabsTrigger value="standings" className="text-xs font-medium">
            <Trophy className="h-3.5 w-3.5 mr-1" />
            Scholarship
          </TabsTrigger>
          <TabsTrigger value="incourse" className="text-xs font-medium">
            In-Course
          </TabsTrigger>
          <TabsTrigger value="semester_final" className="text-xs font-medium">
            Sem Final
          </TabsTrigger>
          <TabsTrigger value="nu_final" className="text-xs font-medium">
            NU Final (CGPA)
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SCHOLARSHIP STANDINGS & RANKING ── */}
        <TabsContent value="standings" className="space-y-4 pt-3">
          {/* Rules Banner */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  DCC CSE Department Merit Scholarship Policy
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  Calculated based on <strong>{scholarshipConfig?.inCourseWeight || 30}% In-Course</strong> +{' '}
                  <strong>{scholarshipConfig?.semesterFinalWeight || 70}% Semester Final</strong> marks.
                  The <strong>Top {scholarshipConfig?.topStudentsCount || 5} students</strong> in the semester earn a{' '}
                  <strong>{scholarshipConfig?.scholarshipPercentage || 50}% fee waiver</strong> for the next semester!
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 text-xs bg-background/80"
                onClick={() => setConfigDialogOpen(true)}
              >
                Configure Policy
              </Button>
            )}
          </div>

          {/* Standings Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <Medal className="h-4 w-4 text-primary" />
                Semester {selectedSemester} Merit Standings Leaderboard
              </h2>
              <span className="text-xs text-muted-foreground">
                {standings.length} student{standings.length === 1 ? '' : 's'} ranked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse min-w-137.5">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <th className="py-3 px-4 w-20">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 w-27.5">Roll</th>
                    <th className="py-3 px-4 text-right w-30">In-Course Tot</th>
                    <th className="py-3 px-4 text-right w-30">Final Tot</th>
                    <th className="py-3 px-4 text-right w-32.5">Combined Score</th>
                    <th className="py-3 px-4 text-center w-35">Scholarship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                        Calculating merit rankings...
                      </td>
                    </tr>
                  ) : standings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No marks entered for this semester yet. Click &quot;Record Marks&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    standings.map((st) => {
                      const isMe =
                        st.studentId === studentId || (rollNumber && st.rollNumber === rollNumber);
                      return (
                        <tr
                          key={st.studentId}
                          className={`hover:bg-muted/30 transition-colors ${
                            isMe ? 'bg-primary/5 font-medium' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            {st.rank === 1 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white font-bold text-xs shadow-xs">
                                1
                              </span>
                            ) : st.rank === 2 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-400 text-white font-bold text-xs shadow-xs">
                                2
                              </span>
                            ) : st.rank === 3 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700 text-white font-bold text-xs shadow-xs">
                                3
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-mono pl-1.5">
                                #{st.rank}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {st.studentName}
                              {isMe && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/50 text-primary">
                                  You
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {st.rollNumber || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {st.totalInCourseMarks}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {st.totalSemesterFinalMarks}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-primary font-mono">
                            {st.combinedScore}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {st.isEligibleForScholarship ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] gap-1 shadow-xs">
                                <Award className="h-3 w-3" /> 50% Waiver
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: IN-COURSE RESULTS ── */}
        <TabsContent value="incourse" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">In-Course Examination Marks</h2>
              <p className="text-xs text-muted-foreground">
                Total Obtained: <strong>{inCourseStats.obtained}</strong> / {inCourseStats.max} ({inCourseStats.pct.toFixed(1)}%)
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => {
                setEditingRecord({
                  semesterId,
                  studentId,
                  studentName,
                  rollNumber,
                  inCourseMaxMarks: 20,
                });
                setEntryDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Marks
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse min-w-137.5">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <th className="py-3 px-4 w-27.5">Code</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-right w-35">Obtained Marks</th>
                    <th className="py-3 px-4 text-right w-27.5">Max Marks</th>
                    <th className="py-3 px-4 text-right w-27.5">Percentage</th>
                    <th className="py-3 px-4 text-right w-22.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No subjects found for Semester {selectedSemester}.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub) => {
                      const rec = myResults.find((r) => r.subjectCode === sub.code);
                      const obtained = rec?.inCourseMarks;
                      const max = rec?.inCourseMaxMarks || 20;
                      const pct =
                        obtained !== undefined && obtained !== null && max > 0
                          ? (obtained / max) * 100
                          : null;

                      return (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium">{sub.code}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{sub.name}</div>
                            <div className="text-xs text-muted-foreground">{sub.credits} Credits</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                            {obtained !== undefined && obtained !== null ? obtained : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                            {max}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingRecord({
                                  ...rec,
                                  semesterId,
                                  studentId,
                                  studentName,
                                  rollNumber,
                                  subjectCode: sub.code,
                                  subjectName: sub.name,
                                  inCourseMarks: obtained,
                                  inCourseMaxMarks: max,
                                });
                                setEntryDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: SEMESTER FINAL RESULTS ── */}
        <TabsContent value="semester_final" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Semester Final Examination Marks</h2>
              <p className="text-xs text-muted-foreground">
                Total Obtained: <strong>{semesterFinalStats.obtained}</strong> / {semesterFinalStats.max} ({semesterFinalStats.pct.toFixed(1)}%)
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => {
                setEditingRecord({
                  semesterId,
                  studentId,
                  studentName,
                  rollNumber,
                  semesterFinalMaxMarks: 80,
                });
                setEntryDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Marks
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse min-w-137.5">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <th className="py-3 px-4 w-27.5">Code</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-right w-35">Obtained Marks</th>
                    <th className="py-3 px-4 text-right w-27.5">Max Marks</th>
                    <th className="py-3 px-4 text-right w-27.5">Percentage</th>
                    <th className="py-3 px-4 text-right w-22.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No subjects found for Semester {selectedSemester}.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub) => {
                      const rec = myResults.find((r) => r.subjectCode === sub.code);
                      const obtained = rec?.semesterFinalMarks;
                      const max = rec?.semesterFinalMaxMarks || 80;
                      const pct =
                        obtained !== undefined && obtained !== null && max > 0
                          ? (obtained / max) * 100
                          : null;

                      return (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium">{sub.code}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{sub.name}</div>
                            <div className="text-xs text-muted-foreground">{sub.credits} Credits</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                            {obtained !== undefined && obtained !== null ? obtained : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                            {max}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingRecord({
                                  ...rec,
                                  semesterId,
                                  studentId,
                                  studentName,
                                  rollNumber,
                                  subjectCode: sub.code,
                                  subjectName: sub.name,
                                  semesterFinalMarks: obtained,
                                  semesterFinalMaxMarks: max,
                                });
                                setEntryDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: NU FINAL RESULTS (OFFICIAL CGPA) ── */}
        <TabsContent value="nu_final" className="space-y-4 pt-3">
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Official National University Grading:</strong> In-Course and Semester Final marks are used internally by the college for scholarship ranking and progress tracking. Only your final <strong>NU Letter Grade & Grade Point</strong> are entered into your official transcript to calculate Semester GPA and CGPA.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight">National University (NU) Final Grades</h2>
                <p className="text-xs text-muted-foreground">
                  Semester GPA:{' '}
                  <strong>
                    {semesterGpa && semesterGpa.totalCredits > 0
                      ? semesterGpa.gpa.toFixed(2)
                      : '0.00'}
                  </strong>{' '}
                  ({semesterGpa?.totalCredits || 0} Total Credits)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse min-w-137.5">
                <thead>
                  <tr className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <th className="py-3 px-4 w-27.5">Code</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center w-22.5">Credits</th>
                    <th className="py-3 px-4 text-center w-30">Letter Grade</th>
                    <th className="py-3 px-4 text-right w-30">Grade Point</th>
                    <th className="py-3 px-4 text-right w-27.5">Credit × GP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No subjects found for Semester {selectedSemester}.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub) => {
                      const res = nuResults.find((r) => r.subjectId === sub.id);
                      return (
                        <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium">{sub.code}</td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">{sub.name}</td>
                          <td className="py-3.5 px-4 text-center font-mono">{sub.credits}</td>
                          <td className="py-3.5 px-4 text-center">
                            {res ? (
                              <Badge
                                variant={res.gradePoint >= 3.0 ? 'default' : 'secondary'}
                                className="font-mono text-xs font-bold"
                              >
                                {res.grade}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Pending</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {res ? res.gradePoint.toFixed(2) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                            {res ? (res.credits * res.gradePoint).toFixed(2) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Marks Entry Dialog */}
      {entryDialogOpen && editingRecord && (
        <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSaveMarks}>
              <DialogHeader>
                <DialogTitle>Record Course Marks</DialogTitle>
                <DialogDescription>
                  Enter In-Course, Semester Final, or NU Final grades.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Student Name</Label>
                      <Input
                        value={editingRecord.studentName || ''}
                        onChange={(e) =>
                          setEditingRecord((prev) => (prev ? { ...prev, studentName: e.target.value } : null))
                        }
                        placeholder="Student name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Roll Number</Label>
                      <Input
                        value={editingRecord.rollNumber || ''}
                        onChange={(e) =>
                          setEditingRecord((prev) => (prev ? { ...prev, rollNumber: e.target.value } : null))
                        }
                        placeholder="Roll number"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Subject *</Label>
                  <Select
                    value={editingRecord.subjectCode}
                    onValueChange={(code) => {
                      if (!code) return;
                      const sub = subjects.find((s) => s.code === code);
                      setEditingRecord((prev) =>
                        prev
                          ? {
                              ...prev,
                              subjectCode: code,
                              subjectName: sub?.name || '',
                            }
                          : null
                      );
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.code} className="text-xs">
                          {s.code} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="font-semibold text-foreground text-xs">
                    In-Course Examination
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Obtained Marks</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max={editingRecord.inCourseMaxMarks || 20}
                        value={editingRecord.inCourseMarks ?? ''}
                        onChange={(e) =>
                          setEditingRecord((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  inCourseMarks: e.target.value === '' ? undefined : Number(e.target.value),
                                }
                              : null
                          )
                        }
                        placeholder="e.g. 18"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Max Marks</Label>
                      <Input
                        type="number"
                        value={editingRecord.inCourseMaxMarks || 20}
                        onChange={(e) =>
                          setEditingRecord((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  inCourseMaxMarks: Number(e.target.value),
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="font-semibold text-foreground text-xs">
                    Semester Final Examination
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Obtained Marks</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max={editingRecord.semesterFinalMaxMarks || 80}
                        value={editingRecord.semesterFinalMarks ?? ''}
                        onChange={(e) =>
                          setEditingRecord((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  semesterFinalMarks: e.target.value === '' ? undefined : Number(e.target.value),
                                }
                              : null
                          )
                        }
                        placeholder="e.g. 68"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Max Marks</Label>
                      <Input
                        type="number"
                        value={editingRecord.semesterFinalMaxMarks || 80}
                        onChange={(e) =>
                          setEditingRecord((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  semesterFinalMaxMarks: Number(e.target.value),
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="font-semibold text-foreground text-xs">
                    National University Final (Official CGPA)
                  </span>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Official Letter Grade</Label>
                    <Select
                      value={editingRecord.nuGrade || ''}
                      onValueChange={(grade) => {
                        const scale = grade ? gradeScale.find((g) => g.grade === grade) : undefined;
                        setEditingRecord((prev) =>
                          prev
                            ? {
                                ...prev,
                                nuGrade: grade || undefined,
                                nuGradePoint: scale?.point ?? 0,
                              }
                            : null
                        );
                      }}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select Grade (e.g. A+)" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeScale.map((g) => (
                          <SelectItem key={g.id} value={g.grade} className="text-xs">
                            {g.grade} ({g.point.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEntryDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Record</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Admin Scholarship Config Dialog */}
      {configDialogOpen && (
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configure Scholarship Policy</DialogTitle>
              <DialogDescription>
                Customize weight distribution and scholarship qualification quota.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">In-Course Weight (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tempConfig.inCourseWeight ?? 30}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        inCourseWeight: Number(e.target.value),
                        semesterFinalWeight: 100 - Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Semester Final Weight (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={tempConfig.semesterFinalWeight ?? 70}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        semesterFinalWeight: Number(e.target.value),
                        inCourseWeight: 100 - Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Top Students Awarded</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={tempConfig.topStudentsCount ?? tempConfig.topCount ?? 5}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTempConfig((prev) => ({
                        ...prev,
                        topCount: val,
                        topStudentsCount: val,
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fee Discount Percentage (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={tempConfig.scholarshipPercentage ?? tempConfig.discountPercent ?? 50}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTempConfig((prev) => ({
                        ...prev,
                        discountPercent: val,
                        scholarshipPercentage: val,
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfigDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveConfig}>Save Rules</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
