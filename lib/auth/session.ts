import { cookies } from 'next/headers';
import { getServerDb } from '@/lib/db/server/db';
import { sessions, users } from '@/lib/db/server/schema';
import { eq, and, gt } from 'drizzle-orm';

const SESSION_COOKIE_NAME = 'dcc-cse-session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generate a cryptographically random session token.
 */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a session token for storage (SHA-256).
 * We store the hash, not the raw token, in the database.
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new session for a user, store it in the DB, and set the cookie.
 */
export async function createSession(
  userId: string,
  userAgent?: string
): Promise<string> {
  const db = getServerDb();
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: userAgent?.slice(0, 500),
  });

  // Set the session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

/**
 * Validate a session token and return the user if valid.
 * Also refreshes the session expiry on use.
 */
export async function validateSession(): Promise<{
  user: { id: string; username: string; mobile: string };
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const db = getServerDb();
  const tokenHash = await hashToken(token);

  // Find a valid, non-expired session
  const result = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      username: users.username,
      mobile: users.mobile,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    // Invalid or expired session — clear the cookie
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const row = result[0];

  // Refresh the session expiry (extend by SESSION_DURATION_MS)
  const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  await db
    .update(sessions)
    .set({ expiresAt: newExpiry, lastUsedAt: new Date() })
    .where(eq(sessions.id, row.sessionId));

  // Refresh the cookie expiry too
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: newExpiry,
  });

  return {
    user: {
      id: row.userId,
      username: row.username,
      mobile: row.mobile,
    },
    sessionId: row.sessionId,
  };
}

/**
 * Delete the current session (logout).
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const db = getServerDb();
    const tokenHash = await hashToken(token);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Delete all sessions for a user (security action).
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  const db = getServerDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
