'use client';

import { useState, useMemo } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { useAttendance } from '@/lib/hooks/useAttendance';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_ICONS } from '@/lib/constants';
import { todayISO } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { AttendanceStatus } from '@/types/database';

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; icon: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }[] = [
  { status: 'present', label: 'Present', icon: '✓', variant: 'default' },
  { status: 'absent', label: 'Absent', icon: '✕', variant: 'destructive' },
  { status: 'late', label: 'Late', icon: '⏱', variant: 'secondary' },
  { status: 'noClass', label: 'No Class', icon: '—', variant: 'outline' },
];

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
                        {currentStatus && (
                          <Badge variant="outline" className="text-xs">
                            {ATTENDANCE_STATUS_ICONS[currentStatus]} {ATTENDANCE_STATUS_LABELS[currentStatus]}
                          </Badge>
                        )}
                      </div>

                      {/* Quick mark buttons — optimized for mobile */}
                      <div className="grid grid-cols-4 gap-2">
                        {STATUS_BUTTONS.map((btn) => (
                          <Button
                            key={btn.status}
                            variant={currentStatus === btn.status ? 'default' : btn.variant}
                            size="sm"
                            className={`text-xs h-9 ${
                              currentStatus === btn.status ? 'ring-2 ring-ring ring-offset-1' : ''
                            }`}
                            onClick={() => handleMark(subject.id, btn.status)}
                          >
                            <span className="mr-1">{btn.icon}</span>
                            <span className="hidden sm:inline">{btn.label}</span>
                          </Button>
                        ))}
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
