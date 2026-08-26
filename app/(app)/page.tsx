'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAttendance } from '@/lib/hooks/useAttendance';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { gpaService, type CgpaResult } from '@/lib/services/gpa.service';
import { assignmentService } from '@/lib/services/assignment.service';
import { examService } from '@/lib/services/exam.service';
import { feeService, type FeeSummary } from '@/lib/services/fee.service';
import { routineService } from '@/lib/services/routine.service';
import { formatCurrency, formatDate, formatTime, getCurrentDay } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Separator } from '@/components/ui/separator';
import {
  CheckSquare,
  BarChart3,
  BookOpen,
  DollarSign,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import type { Assignment, Exam, RoutineSlot, Subject, DayOfWeek } from '@/types/database';

export default function DashboardPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { overallStats, targetInfo } = useAttendance(semesterId);
  const { subjects } = useSubjects(semesterId);

  const [cgpa, setCgpa] = useState<CgpaResult | null>(null);
  const [semesterGpa, setSemesterGpa] = useState<number>(0);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [todayClasses, setTodayClasses] = useState<(RoutineSlot & { subject?: Subject })[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);

  useEffect(() => {
    if (!semesterId) return;

    const loadDashboardData = async () => {
      try {
        const [cgpaResult, assignments, exams, fees, payments, routine] = await Promise.all([
          gpaService.calculateCgpa(),
          assignmentService.getUpcoming(semesterId),
          examService.getUpcoming(semesterId),
          feeService.getBySemester(semesterId),
          feeService.getPaymentsBySemester(semesterId),
          routineService.getBySemester(semesterId),
        ]);

        setCgpa(cgpaResult);

        const semGpa = cgpaResult.semesterGpas.find((s) => s.semesterId === semesterId);
        setSemesterGpa(semGpa?.gpa || 0);

        setUpcomingAssignments(assignments.slice(0, 3));
        setUpcomingExams(exams.slice(0, 3));
        setFeeSummary(feeService.calculateSummary(fees, payments));

        // Today's classes
        const today = getCurrentDay() as DayOfWeek;
        const todayRoutine = routine
          .filter((r) => r.dayOfWeek === today)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        setTodayClasses(todayRoutine.map((r) => ({
          ...r,
          subject: subjects.find((s) => s.id === r.subjectId),
        })));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };

    loadDashboardData();
  }, [semesterId, subjects]);

  if (!profile) return null;

  const greeting = getGreeting(profile.fullName);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semester {profile.currentSemester} · {profile.department}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Attendance"
          value={`${overallStats.percentage}%`}
          subtitle={`${overallStats.attended}/${overallStats.totalConducted} classes`}
          icon={CheckSquare}
          href="/attendance"
          color={overallStats.percentage >= 75 ? 'text-green-500' : 'text-red-500'}
        />
        <StatsCard
          title="Semester GPA"
          value={semesterGpa.toFixed(2)}
          subtitle={`Semester ${profile.currentSemester}`}
          icon={BarChart3}
          href="/gpa"
        />
        <StatsCard
          title="CGPA"
          value={cgpa ? cgpa.cgpa.toFixed(2) : '0.00'}
          subtitle={`${cgpa?.totalCredits || 0} credits`}
          icon={TrendingUp}
          href="/gpa"
        />
        <StatsCard
          title="Pending Fees"
          value={feeSummary ? formatCurrency(feeSummary.remaining) : '৳0'}
          subtitle={feeSummary?.remaining === 0 ? 'All clear!' : 'Balance due'}
          icon={DollarSign}
          href="/fees"
          color={feeSummary && feeSummary.remaining > 0 ? 'text-amber-500' : undefined}
        />
      </div>

      {/* Attendance Target Alert */}
      {!targetInfo.isAboveTarget && overallStats.totalConducted > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {targetInfo.message}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Classes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Classes</CardTitle>
              <Link href="/routine">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No classes scheduled for today.
              </p>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex flex-col items-center text-xs text-muted-foreground min-w-15">
                      <span className="font-medium">{formatTime(slot.startTime)}</span>
                      <span>–</span>
                      <span>{formatTime(slot.endTime)}</span>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {slot.subject?.name || 'Unknown Subject'}
                      </p>
                      {slot.room && (
                        <p className="text-xs text-muted-foreground">Room: {slot.room}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/attendance" icon={CheckSquare} label="Mark Attendance" />
              <QuickAction href="/subjects" icon={BookOpen} label="Add Subject" />
              <QuickAction href="/assignments" icon={ClipboardList} label="Add Assignment" />
              <QuickAction href="/exams" icon={GraduationCap} label="Add Exam" />
              <QuickAction href="/fees" icon={DollarSign} label="Add Payment" />
              <QuickAction href="/gpa" icon={BarChart3} label="GPA Calculator" />
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Assignments</CardTitle>
              <Link href="/assignments">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming assignments.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingAssignments.map((a) => {
                  const subject = subjects.find((s) => s.id === a.subjectId);
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{subject?.name}</p>
                      </div>
                      <Badge variant={a.priority === 'high' ? 'destructive' : 'secondary'} className="ml-2 text-xs">
                        {formatDate(a.deadline, { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Exams</CardTitle>
              <Link href="/exams">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming exams.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((e) => {
                  const subject = subjects.find((s) => s.id === e.subjectId);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const daysLeft = Math.ceil(
                    (new Date(e.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{subject?.name}</p>
                      </div>
                      <Badge variant={daysLeft <= 3 ? 'destructive' : 'secondary'} className="ml-2 text-xs">
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Helper Components ─────────────────────────────────

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color?: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href} className="w-full">
      <Button variant="outline" className="h-auto w-full flex-col gap-1.5 py-3 text-xs">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}
