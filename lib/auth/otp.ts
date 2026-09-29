/**
 * OTP and Reset Token Utilities
 * Cryptographically secure helpers for password recovery.
 */

/**
 * Generate a cryptographically secure 6-digit numerical OTP.
 */
export function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (100000 + (array[0] % 900000)).toString();
}

/**
 * Hash an OTP using SHA-256 for secure database storage.
 * Plain-text OTP is never stored in the database.
 */
export async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure 32-byte hex reset token for the password reset step.
 */
export function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
