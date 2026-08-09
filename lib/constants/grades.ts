import type { GradeScale } from '@/types/database';

export const DEFAULT_GRADE_SCALE: Omit<GradeScale, 'id'>[] = [
  { grade: 'A+', point: 4.00, minMarks: 80, order: 0 },
  { grade: 'A',  point: 3.75, minMarks: 75, order: 1 },
  { grade: 'A-', point: 3.50, minMarks: 70, order: 2 },
  { grade: 'B+', point: 3.25, minMarks: 65, order: 3 },
  { grade: 'B',  point: 3.00, minMarks: 60, order: 4 },
  { grade: 'B-', point: 2.75, minMarks: 55, order: 5 },
  { grade: 'C+', point: 2.50, minMarks: 50, order: 6 },
  { grade: 'C',  point: 2.25, minMarks: 45, order: 7 },
  { grade: 'D',  point: 2.00, minMarks: 40, order: 8 },
  { grade: 'F',  point: 0.00, minMarks: 0,  order: 9 },
];
