import { z } from 'zod/v4';

const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'medical', 'holiday', 'noClass']);

export const attendanceSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  date: z.string().min(1, 'Date is required'),
  status: attendanceStatusEnum,
  note: z.string().max(200).optional().or(z.literal('')),
});

export const attendanceBulkSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  records: z.array(z.object({
    subjectId: z.string().min(1),
    status: attendanceStatusEnum,
    note: z.string().optional(),
  })).min(1, 'At least one record is required'),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;
export type AttendanceBulkFormData = z.infer<typeof attendanceBulkSchema>;
