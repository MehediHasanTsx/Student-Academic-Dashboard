'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { gpaService, type SemesterGpaResult, type CgpaResult, type TargetCgpaResult } from '@/lib/services/gpa.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BarChart3, Plus, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { GradeScale, Result, Subject } from '@/types/database';

export default function GpaPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);

  const [gradeScale, setGradeScale] = useState<GradeScale[]>([]);
  const [semesterResult, setSemesterResult] = useState<SemesterGpaResult | null>(null);
  const [cgpaResult, setCgpaResult] = useState<CgpaResult | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Target CGPA state
  const [targetCgpa, setTargetCgpa] = useState('3.50');
  const [remainingCredits, setRemainingCredits] = useState('60');
  const [targetResult, setTargetResult] = useState<TargetCgpaResult | null>(null);

  useEffect(() => {
    loadData();
  }, [semesterId]);

  const loadData = async () => {
    try {
      const [scale, cgpa] = await Promise.all([
        gpaService.getGradeScale(),
        gpaService.calculateCgpa(),
      ]);
      setGradeScale(scale);
      setCgpaResult(cgpa);

      if (semesterId) {
        const results = await gpaService.getResultsBySemester(semesterId);
        setSemesterResult(gpaService.calculateSemesterGpa(results));
      }
    } catch (err) {
      console.error('Failed to load GPA data:', err);
    }
  };

  const handleAddResult = async (subjectId: string, grade: string) => {
    if (!semesterId) return;
    const subject = subjects.find((s) => s.id === subjectId);
    const gradeItem = gradeScale.find((g) => g.grade === grade);
    if (!subject || !gradeItem) return;

    try {
      await gpaService.saveResult(semesterId, {
        subjectId,
        grade,
        gradePoint: gradeItem.point,
        credits: subject.credits,
      });
      toast.success('Result saved.');
      await loadData();
    } catch {
      toast.error('Failed to save result.');
    }
  };

  const calculateTarget = () => {
    if (!cgpaResult) return;
    const result = gpaService.calculateTargetCgpa(
      cgpaResult.cgpa,
      cgpaResult.totalCredits,
      parseFloat(remainingCredits) || 0,
      parseFloat(targetCgpa) || 0
    );
    setTargetResult(result);
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GPA / CGPA</h1>
        <p className="text-sm text-muted-foreground">
          Semester {profile.currentSemester} · Grade calculator
        </p>
      </div>

      <Tabs defaultValue="semester" className="space-y-4">
        <TabsList>
          <TabsTrigger value="semester">Semester GPA</TabsTrigger>
          <TabsTrigger value="cgpa">Overall CGPA</TabsTrigger>
          <TabsTrigger value="target">Target CGPA</TabsTrigger>
        </TabsList>

        {/* Semester GPA */}
        <TabsContent value="semester" className="space-y-4">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Semester GPA</p>
                <p className="text-2xl font-bold">{semesterResult?.gpa.toFixed(2) || '0.00'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Credits</p>
                <p className="text-2xl font-bold">{semesterResult?.totalCredits || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Earned Credits</p>
                <p className="text-2xl font-bold">{semesterResult?.earnedCredits || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Courses</p>
                <p className="text-2xl font-bold">{semesterResult?.results.length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Result Entry */}
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Add subjects first to enter grades.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => {
                const result = semesterResult?.results.find((r) => r.subjectId === subject.id);
                return (
                  <Card key={subject.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code} · {subject.credits} credits</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {result && (
                            <Badge variant="secondary" className="text-sm font-mono">
                              {result.grade} ({result.gradePoint.toFixed(2)})
                            </Badge>
                          )}
                          <Select
                            value={result?.grade || ''}
                            onValueChange={(grade) => { if (grade) handleAddResult(subject.id, grade); }}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {gradeScale.map((g) => (
                                <SelectItem key={g.id} value={g.grade}>
                                  {g.grade} ({g.point.toFixed(2)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* CGPA Overview */}
        <TabsContent value="cgpa" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-xs text-muted-foreground mb-2">Overall CGPA</p>
              <p className="text-5xl font-bold">{cgpaResult?.cgpa.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {cgpaResult?.totalCredits || 0} total credits
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, i) => {
              const semGpa = cgpaResult?.semesterGpas.find((s) => s.semesterNumber === i + 1);
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Semester {i + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {semGpa ? `${semGpa.credits} credits` : 'No results'}
                        </p>
                      </div>
                      <p className={`text-lg font-bold ${semGpa ? '' : 'text-muted-foreground'}`}>
                        {semGpa ? semGpa.gpa.toFixed(2) : '—'}
                      </p>
                    </div>
                    {semGpa && (
                      <Progress value={(semGpa.gpa / 4) * 100} className="h-1.5 mt-2" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Target CGPA */}
        <TabsContent value="target" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target CGPA Calculator</CardTitle>
              <CardDescription>
                Calculate the GPA you need in remaining semesters to achieve your target CGPA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current CGPA</Label>
                  <Input value={cgpaResult?.cgpa.toFixed(2) || '0.00'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Completed Credits</Label>
                  <Input value={cgpaResult?.totalCredits || 0} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remainingCredits">Remaining Credits</Label>
                  <Input
                    id="remainingCredits"
                    type="number"
                    value={remainingCredits}
                    onChange={(e) => setRemainingCredits(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCgpa">Target CGPA</Label>
                  <Input
                    id="targetCgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={targetCgpa}
                    onChange={(e) => setTargetCgpa(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={calculateTarget} className="w-full">
                <Target className="mr-2 h-4 w-4" /> Calculate
              </Button>

              {targetResult && (
                <Card className={targetResult.isPossible ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}>
                  <CardContent className="p-4">
                    {targetResult.isPossible ? (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Required GPA for remaining credits</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {targetResult.requiredGpa.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">
                          {targetResult.message}
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      {targetResult.message}
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
