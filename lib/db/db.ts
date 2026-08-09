import Dexie, { type EntityTable } from 'dexie';

// ── Types ──────────────────────────────────────────────

export interface Semester {
  id: string;
  name: string;          // e.g. "1st Semester"
  year: string;          // e.g. "1st Year"
  yearNumber: number;    // 1–4
  semesterNumber: number; // 1–8
}

export interface Subject {
  id: string;
  semesterId: string;
  name: string;
  code?: string;
}

export interface Project {
  id: string;
  title: string;
  labNumber: string;       // e.g. "Lab 01"
  semesterId: string;
  subjectId: string;
  description: string;
  language: string;        // e.g. "cpp", "python", "java"
  technologies: string[];
  tags: string[];
  sourceCode: string;
  fileName?: string;       // e.g. "linked_list.cpp"
  githubUrl?: string;
  liveDemoUrl?: string;
  notes?: string;
  overview?: string;
  objective?: string;
  conceptsLearned?: string;
  outputResult?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaRecord {
  id: string;
  value: string;
}

// ── Database ───────────────────────────────────────────

const db = new Dexie('StudentAcademicDashboard') as Dexie & {
  semesters: EntityTable<Semester, 'id'>;
  subjects: EntityTable<Subject, 'id'>;
  projects: EntityTable<Project, 'id'>;
  meta: EntityTable<MetaRecord, 'id'>;
};

db.version(1).stores({
  semesters: 'id, yearNumber, semesterNumber',
  subjects: 'id, semesterId, name',
  projects: 'id, semesterId, subjectId, language, createdAt, updatedAt, [semesterId+subjectId]',
  meta: 'id',
});

export { db };
