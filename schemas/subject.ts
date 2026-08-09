import { z } from 'zod/v4';

const subjectTypeEnum = z.enum(['theory', 'lab']);
const dayOfWeekEnum = z.enum(['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

export const subjectSchema = z.object({
  code: z.string().min(1, 'Course code is required').max(20),
  name: z.string().min(1, 'Course name is required').max(100),
  teacher: z.string().max(100).optional().or(z.literal('')),
  credits: z.number({ message: 'Credits is required' }).min(0.5).max(10),
  type: subjectTypeEnum,
  classDays: z.array(dayOfWeekEnum).optional(),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  room: z.string().max(50).optional().or(z.literal('')),
  color: z.string().max(20).optional().or(z.literal('')),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;
