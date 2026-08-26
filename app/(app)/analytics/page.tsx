'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAttendance } from '@/lib/hooks/useAttendance';
import { gpaService, type CgpaResult } from '@/lib/services/gpa.service';
import { settingsService } from '@/lib/services/settings.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, BookOpen, CheckSquare } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';



export default function AnalyticsPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { overallStats } = useAttendance(semesterId);
  const [cgpa, setCgpa] = useState<CgpaResult | null>(null);
  const [totalCredits, setTotalCredits] = useState(160);

  useEffect(() => {
    gpaService.calculateCgpa().then(setCgpa);
    settingsService.get().then((s) => s && setTotalCredits(s.totalRequiredCredits));
  }, []);

  if (!profile) return null;

  const gpaChartData = cgpa?.semesterGpas.map((s) => ({
    name: `Sem ${s.semesterNumber}`,
    gpa: s.gpa,
  })) || [];

  const attendancePieData = [
    { name: 'Present', value: overallStats.attended, color: '#22c55e' },
    { name: 'Absent', value: overallStats.absent, color: '#ef4444' },
    { name: 'Late', value: overallStats.late, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  const completedCredits = cgpa?.totalCredits || 0;
  const degreeProgress = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;
  const completedSemesters = cgpa?.semesterGpas.length || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Academic progress and insights</p>
      </div>

      {/* Degree Progress */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Degree Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span>{degreeProgress}% complete</span>
                <span className="text-muted-foreground">{completedCredits} / {totalCredits} credits</span>
              </div>
              <Progress value={degreeProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {completedSemesters} of 8 semesters completed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* GPA Trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">GPA Trend</CardTitle></CardHeader>
          <CardContent>
            {gpaChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No GPA data yet.</p>
            ) : (
              <div className="h-62.5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gpaChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="gpa" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Attendance Breakdown</CardTitle></CardHeader>
          <CardContent>
            {attendancePieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No attendance data yet.</p>
            ) : (
              <div className="h-62.5 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {attendancePieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {attendancePieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 text-center"><Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground" /><p className="text-2xl font-bold">{cgpa?.cgpa.toFixed(2) || '0.00'}</p><p className="text-xs text-muted-foreground">Overall CGPA</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckSquare className="h-5 w-5 mx-auto mb-2 text-muted-foreground" /><p className="text-2xl font-bold">{overallStats.percentage}%</p><p className="text-xs text-muted-foreground">Attendance</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><BookOpen className="h-5 w-5 mx-auto mb-2 text-muted-foreground" /><p className="text-2xl font-bold">{completedCredits}</p><p className="text-xs text-muted-foreground">Credits Done</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" /><p className="text-2xl font-bold">{totalCredits - completedCredits}</p><p className="text-xs text-muted-foreground">Credits Left</p></CardContent></Card>
      </div>
    </div>
  );
}
