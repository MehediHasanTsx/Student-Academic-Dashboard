import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password using bcryptjs.
 * Server-only — never import on the client.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
