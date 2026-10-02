import { pgTable, uuid, varchar, integer, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

// ── Users Table ──────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  email: varchar('email', { length: 200 }).unique(),
  mobile: varchar('mobile', { length: 20 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('student'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_username').on(table.username),
  index('idx_users_email').on(table.email),
  index('idx_users_mobile').on(table.mobile),
]);

// ── Sessions Table ───────────────────────────────────
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  userAgent: varchar('user_agent', { length: 500 }),
}, (table) => [
  index('idx_sessions_user_id').on(table.userId),
  index('idx_sessions_token_hash').on(table.tokenHash),
  index('idx_sessions_expires_at').on(table.expiresAt),
]);

// ── Profiles Table ───────────────────────────────────
// Synced from client during onboarding so admin can see user details
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  university: varchar('university', { length: 200 }).notNull(),
  department: varchar('department', { length: 200 }).notNull(),
  studentId: varchar('student_id', { length: 50 }).notNull(),
  rollNumber: varchar('roll_number', { length: 50 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 50 }).notNull(),
  batch: varchar('batch', { length: 50 }).notNull(),
  session: varchar('session', { length: 50 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  email: varchar('email', { length: 200 }),
  bloodGroup: varchar('blood_group', { length: 10 }),
  emergencyContact: varchar('emergency_contact', { length: 100 }),
  currentSemester: integer('current_semester').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_profiles_user_id').on(table.userId),
]);

// ── User Data Table ──────────────────────────────────
// Stores a full JSON blob of all user data for cross-device sync.
// Each user has one row; data is overwritten on each sync.
export const userData = pgTable('user_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_user_data_user_id').on(table.userId),
]);

// ── Main / Shared Data Table (Admin Maintained) ───────
// Authoritative source of truth for subjects, routine, and exams.
export const mainData = pgTable('main_data', {
  id: varchar('id', { length: 50 }).primaryKey(), // e.g. 'semester-5'
  semesterId: varchar('semester_id', { length: 50 }).notNull().default('semester-5'),
  subjects: jsonb('subjects').notNull().default([]),
  routine: jsonb('routine').notNull().default([]),
  exams: jsonb('exams').notNull().default([]),
  examRoutines: jsonb('exam_routines').notNull().default([]),
  labGroups: jsonb('lab_groups').notNull().default([]),
  scholarshipResults: jsonb('scholarship_results').notNull().default([]),
  scholarshipConfig: jsonb('scholarship_config').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// ── Password Reset OTPs Table ────────────────────────
// Secure hashed OTPs for email password recovery
export const passwordResetOtps = pgTable('password_reset_otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  otpHash: varchar('otp_hash', { length: 255 }).notNull(),
  resetToken: varchar('reset_token', { length: 255 }).unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_reset_otps_user_id').on(table.userId),
  index('idx_reset_otps_reset_token').on(table.resetToken),
  index('idx_reset_otps_expires_at').on(table.expiresAt),
]);

// ── Type Exports ─────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserData = typeof userData.$inferSelect;
export type NewUserData = typeof userData.$inferInsert;
export type MainDataRecord = typeof mainData.$inferSelect;
export type NewMainDataRecord = typeof mainData.$inferInsert;
export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type NewPasswordResetOtp = typeof passwordResetOtps.$inferInsert;

