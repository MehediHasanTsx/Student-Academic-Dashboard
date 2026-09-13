import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

// ── Users Table ──────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  mobile: varchar('mobile', { length: 20 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_username').on(table.username),
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

// ── Type Exports ─────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
