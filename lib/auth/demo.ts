/**
 * Demo mode utilities.
 *
 * When DATABASE_URL is not configured, the app runs in demo mode:
 * - Auth routes return a static demo user
 * - All data is stored locally in IndexedDB
 * - No server-side authentication is performed
 *
 * This allows developers and testers to use the app without a database.
 */

export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

export const DEMO_USER = {
  id: 'demo-user-local',
  username: 'demo',
  mobile: '+8801700000000',
} as const;
