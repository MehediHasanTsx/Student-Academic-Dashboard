import { z } from 'zod/v4';

export const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  university: z.string().min(1, 'University is required').max(200),
  department: z.string().min(1, 'Department is required').max(200),
  studentId: z.string().min(1, 'Student ID is required').max(50),
  rollNumber: z.string().min(1, 'Roll number is required').max(50),
  registrationNumber: z.string().min(1, 'Registration number is required').max(50),
  batch: z.string().min(1, 'Batch is required').max(50),
  session: z.string().min(1, 'Session is required').max(50),
  phoneNumber: z.string().min(1, 'Phone number is required').max(20),
  email: z.email('Invalid email address').optional().or(z.literal('')),
  bloodGroup: z.string().max(10).optional().or(z.literal('')),
  emergencyContact: z.string().max(100).optional().or(z.literal('')),
  currentSemester: z.number().int().min(1).max(8),
  profilePicture: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
