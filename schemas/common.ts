import { z } from 'zod/v4';

const dayOfWeekEnum = z.enum(['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

export const routineSlotSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  dayOfWeek: dayOfWeekEnum,
  teacher: z.string().max(100).optional().or(z.literal('')),
  room: z.string().max(50).optional().or(z.literal('')),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
});

export const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subjectId: z.string().min(1, 'Subject is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'completed', 'late']),
  description: z.string().max(2000).optional().or(z.literal('')),
});

export const examSchema = z.object({
  name: z.string().min(1, 'Exam name is required').max(200),
  subjectId: z.string().min(1, 'Subject is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().optional().or(z.literal('')),
  room: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export const noteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  semesterId: z.string().optional(),
  subjectId: z.string().optional(),
});

export type RoutineSlotFormData = z.infer<typeof routineSlotSchema>;
export type AssignmentFormData = z.infer<typeof assignmentSchema>;
export type ExamFormData = z.infer<typeof examSchema>;
export type NoteFormData = z.infer<typeof noteSchema>;
