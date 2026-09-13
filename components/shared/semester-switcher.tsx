'use client';

import { useProfile } from '@/lib/hooks/useProfile';
import { db } from '@/lib/db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';

export function SemesterSwitcher() {
  const { profile, setCurrentSemester } = useProfile();
  const semesters = useLiveQuery(() => db().semesters.orderBy('number').toArray(), []);

  if (!semesters || !profile) return null;

  const currentSemesterId = `semester-${profile.currentSemester}`;

  return (
    <Select
      value={currentSemesterId}
      onValueChange={(val) => {
        if (!val) return;
        const num = parseInt(val.replace('semester-', ''), 10);
        if (!isNaN(num)) setCurrentSemester(num);
      }}
    >
      <SelectTrigger className="w-full h-9 text-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Select semester" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {semesters.map((sem) => (
          <SelectItem key={sem.id} value={sem.id}>
            {sem.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
