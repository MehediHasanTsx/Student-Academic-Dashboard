import { z } from 'zod';

export const SUPPORTED_LANGUAGES = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
] as const;

export const LANGUAGE_VALUES = SUPPORTED_LANGUAGES.map((l) => l.value);

const urlSchema = z.string().url('Please enter a valid URL').or(z.literal(''));

export const projectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(200, 'Title must be 200 characters or less'),
  labNumber: z.string().min(1, 'Lab number is required').max(20, 'Lab number must be 20 characters or less'),
  semesterId: z.string().min(1, 'Please select a semester'),
  subjectId: z.string().min(1, 'Please select a subject'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description must be 5000 characters or less'),
  language: z.string().min(1, 'Please select a programming language'),
  technologies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  sourceCode: z.string().default(''),
  fileName: z.string().max(100, 'File name must be 100 characters or less').default(''),
  githubUrl: urlSchema.default(''),
  liveDemoUrl: urlSchema.default(''),
  notes: z.string().max(10000).default(''),
  overview: z.string().max(5000).default(''),
  objective: z.string().max(5000).default(''),
  conceptsLearned: z.string().max(5000).default(''),
  outputResult: z.string().max(5000).default(''),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100, 'Subject name must be 100 characters or less'),
  code: z.string().max(20, 'Code must be 20 characters or less').default(''),
  semesterId: z.string().min(1, 'Please select a semester'),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;
