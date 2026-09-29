'use client';

import { useState, useMemo } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { useAttendance } from '@/lib/hooks/useAttendance';
import { ATTENDANCE_STATUS_LABELS } from '@/lib/constants';
import { todayISO } from '@/lib/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { AttendanceStatus } from '@/types/database';

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    shortLabel: string;
    icon: string;
    activeClass: string;
    inactiveClass: string;
    badgeClass: string;
  }
> = {
  present: {
    label: 'Present',
    shortLabel: 'Pres',
    icon: '✓',
    activeClass:
      'bg-emerald-600 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500 ring-offset-2 ring-offset-background scale-[1.02]',
    inactiveClass:
      'border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-700',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
  },
  absent: {
    label: 'Absent',
    shortLabel: 'Abs',
    icon: '✕',
    activeClass:
      'bg-rose-600 hover:bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30 ring-2 ring-rose-500 ring-offset-2 ring-offset-background scale-[1.02]',
    inactiveClass:
      'border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-700',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40',
  },
  late: {
    label: 'Late',
    shortLabel: 'Late',
    icon: '⏱',
    activeClass:
      'bg-amber-500 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 ring-offset-background scale-[1.02]',
    inactiveClass:
      'border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 hover:text-amber-700',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
  },
  noClass: {
    label: 'No Class',
    shortLabel: 'Off',
    icon: '—',
    activeClass:
      'bg-slate-700 hover:bg-slate-700 dark:bg-slate-600 text-white font-bold shadow-md ring-2 ring-slate-400 ring-offset-2 ring-offset-background scale-[1.02]',
    inactiveClass:
      'border border-slate-400/30 text-slate-600 dark:text-slate-400 bg-slate-500/10 hover:bg-slate-500/20 hover:text-slate-700',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-400/40',
  },
  medical: {
    label: 'Medical',
    shortLabel: 'Med',
    icon: '🏥',
    activeClass:
      'bg-blue-600 hover:bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-500 ring-offset-2 ring-offset-background scale-[1.02]',
    inactiveClass:
      'border border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40',
  },
  holiday: {
    label: 'Holiday',
    shortLabel: 'Hol',
    icon: '🏖',
    activeClass:
      'bg-purple-600 hover:bg-purple-600 text-white font-bold shadow-md ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-[1.02]',
    inactiveClass:
      'border border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40',
  },
};

const BUTTON_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'noClass'];

export default function AttendancePage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);
  const {
    records,
    overallStats,
    subjectStats,
    targetInfo,
    markAttendance,
  } = useAttendance(semesterId);

  const [selectedDate, setSelectedDate] = useState(todayISO());

  // Get attendance for selected date
  const dateRecords = useMemo(
    () => records.filter((r) => r.date === selectedDate),
    [records, selectedDate]
  );

  // Map of subjectId -> status for the selected date
  const dateStatusMap = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const r of dateRecords) {
      map.set(r.subjectId, r.status);
    }
    return map;
  }, [dateRecords]);

  const handleMark = async (subjectId: string, status: AttendanceStatus) => {
    try {
      await markAttendance(subjectId, selectedDate, status);
      toast.success(`Marked ${ATTENDANCE_STATUS_LABELS[status]}`);
    } catch {
      toast.error('Failed to mark attendance.');
    }
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Semester {profile.currentSemester} · {overallStats.percentage}% overall
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Overall</p>
            <p className={`text-2xl font-bold ${overallStats.percentage >= 75 ? 'text-green-500' : 'text-red-500'}`}>
              {overallStats.percentage}%
            </p>
            <Progress value={overallStats.percentage} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Attended</p>
            <p className="text-2xl font-bold">{overallStats.attended}</p>
            <p className="text-xs text-muted-foreground">of {overallStats.totalConducted} classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-500">{overallStats.absent}</p>
            <p className="text-xs text-muted-foreground">classes missed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">
              {targetInfo.isAboveTarget ? 'Can Miss' : 'Need to Attend'}
            </p>
            <p className={`text-2xl font-bold ${targetInfo.isAboveTarget ? 'text-green-500' : 'text-amber-500'}`}>
              {targetInfo.isAboveTarget ? targetInfo.classesCanMiss : targetInfo.classesNeededToReachTarget}
            </p>
            <p className="text-xs text-muted-foreground">
              classes ({targetInfo.target}% target)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Alert */}
      {!targetInfo.isAboveTarget && overallStats.totalConducted > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm">{targetInfo.message}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mark" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
        </TabsList>

        {/* Mark Attendance Tab */}
        <TabsContent value="mark" className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            {selectedDate === todayISO() && (
              <Badge variant="secondary">Today</Badge>
            )}
          </div>

          {subjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No subjects added yet. Add subjects first.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => {
                const currentStatus = dateStatusMap.get(subject.id);
                const stats = subjectStats.get(subject.id);

                return (
                  <Card key={subject.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: subject.color || '#3b82f6' }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{subject.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {stats ? `${stats.percentage}% · ${stats.attended}/${stats.totalConducted}` : 'No records'}
                            </p>
                          </div>
                        </div>
                        {currentStatus && STATUS_CONFIG[currentStatus] && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold px-2 py-0.5 border ${STATUS_CONFIG[currentStatus].badgeClass}`}
                          >
                            <span className="mr-1">{STATUS_CONFIG[currentStatus].icon}</span>
                            {STATUS_CONFIG[currentStatus].label}
                          </Badge>
                        )}
                      </div>

                      {/* Quick mark buttons — vibrant and highly visible */}
                      <div className="grid grid-cols-4 gap-2">
                        {BUTTON_STATUSES.map((status) => {
                          const config = STATUS_CONFIG[status];
                          const isActive = currentStatus === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              className={`flex items-center justify-center gap-1.5 h-10 px-2 rounded-lg text-xs transition-all cursor-pointer ${
                                isActive ? config.activeClass : config.inactiveClass
                              }`}
                              onClick={() => handleMark(subject.id, status)}
                            >
                              <span className="text-sm font-bold">{config.icon}</span>
                              <span className="sm:hidden font-semibold">{config.shortLabel}</span>
                              <span className="hidden sm:inline font-semibold">{config.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* By Subject Tab */}
        <TabsContent value="subjects" className="space-y-3">
          {subjects.map((subject) => {
            const stats = subjectStats.get(subject.id);
            if (!stats) return null;

            return (
              <Card key={subject.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: subject.color || '#3b82f6' }}
                      />
                      <p className="text-sm font-medium">{subject.name}</p>
                    </div>
                    <p className={`text-lg font-bold ${stats.percentage >= 75 ? 'text-green-500' : 'text-red-500'}`}>
                      {stats.percentage}%
                    </p>
                  </div>
                  <Progress value={stats.percentage} className="h-1.5 mb-2" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>✓ {stats.attended} present</span>
                    <span>✕ {stats.absent} absent</span>
                    {stats.late > 0 && <span>⏱ {stats.late} late</span>}
                    <span>Total: {stats.totalConducted}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {subjects.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No subjects added yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
