import { z } from 'zod/v4';

export const resultSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade is required'),
  gradePoint: z.number().min(0).max(4),
  credits: z.number().min(0.5).max(10),
});

export const gradeScaleSchema = z.object({
  grade: z.string().min(1, 'Grade is required').max(5),
  point: z.number().min(0).max(4),
  minMarks: z.number().min(0).max(100).optional(),
  order: z.number().int().min(0),
});

export type ResultFormData = z.infer<typeof resultSchema>;
export type GradeScaleFormData = z.infer<typeof gradeScaleSchema>;
