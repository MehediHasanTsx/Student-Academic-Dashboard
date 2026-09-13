import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Creates a Drizzle database client connected to Neon PostgreSQL.
 * Uses the DATABASE_URL environment variable.
 *
 * This module is server-only — never import it on the client.
 */
function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Create a free Neon PostgreSQL database at https://neon.tech and add the connection string.'
    );
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

// Lazy singleton for the database client
let _db: ReturnType<typeof createDb> | null = null;

export function getServerDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type ServerDb = ReturnType<typeof createDb>;
