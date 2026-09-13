/**
 * Database module — re-exports the user-scoped database accessor.
 *
 * All services import `db` from this module. After the user-scoped migration,
 * `db` is a getter that returns the currently active user's Dexie database.
 *
 * The old single-database approach (`student_academic_dashboard`) is preserved
 * only for data migration purposes. See `lib/db/migration.ts`.
 */

export { getActiveDb as db } from './user-db';
export type { UserDatabase } from './user-db';
