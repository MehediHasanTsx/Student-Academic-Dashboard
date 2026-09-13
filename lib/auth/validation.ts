import { z } from 'zod/v4';

// ── Username ─────────────────────────────────────────

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

/**
 * Normalize a username: trim and lowercase.
 */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

// ── Mobile Number ────────────────────────────────────

/**
 * Normalize a Bangladesh mobile number to the canonical format: +880XXXXXXXXXX
 *
 * Accepts:
 *   01XXXXXXXXX       → +8801XXXXXXXXX
 *   +8801XXXXXXXXX    → +8801XXXXXXXXX
 *   8801XXXXXXXXX     → +8801XXXXXXXXX
 *   0088 01XXXXXXXXX  → +8801XXXXXXXXX
 *
 * Strips spaces, dashes, and parentheses before processing.
 */
export function normalizeMobile(input: string): string {
  // Strip non-digit characters except leading +
  let cleaned = input.replace(/[\s\-()]/g, '');

  // Remove leading 00 (international dialing prefix)
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // If starts with 01 (local BD format), prepend +880
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return '+880' + cleaned.slice(1);
  }

  // If starts with 880 (without +), add +
  if (cleaned.startsWith('880') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // If already has +880, normalize
  if (cleaned.startsWith('+880')) {
    return cleaned;
  }

  // Fallback: return cleaned input (may not be BD number)
  return cleaned;
}

/**
 * Check if a mobile number looks like a valid Bangladesh mobile number.
 * After normalization, it should match +8801[3-9]XXXXXXXX (14 chars total).
 */
export function isValidBDMobile(normalized: string): boolean {
  return /^\+8801[3-9]\d{8}$/.test(normalized);
}

// ── Zod Schemas ──────────────────────────────────────

export const registerSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
    .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
    .regex(USERNAME_REGEX, 'Username can only contain letters, numbers, and underscores'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be at most 128 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
