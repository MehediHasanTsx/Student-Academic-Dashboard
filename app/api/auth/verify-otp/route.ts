import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { users, passwordResetOtps } from '@/lib/db/server/schema';
import { normalizeUsername } from '@/lib/auth/validation';
import { hashOtp, generateResetToken } from '@/lib/auth/otp';
import { eq, and, gt, desc, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username: rawUsername, otp } = body;

    if (!rawUsername || !otp) {
      return NextResponse.json(
        { error: 'Username and verification code are required.' },
        { status: 400 }
      );
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: 'Verification code must be exactly 6 digits.' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(rawUsername);
    const db = getServerDb();

    // 1. Look up user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    const now = new Date();

    // 2. Find active, unexpired, unused OTP record
    const [otpRecord] = await db
      .select()
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          isNull(passwordResetOtps.usedAt),
          gt(passwordResetOtps.expiresAt, now)
        )
      )
      .orderBy(desc(passwordResetOtps.createdAt))
      .limit(1);

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Verification code expired or not found. Please request a new code.' },
        { status: 400 }
      );
    }

    // 3. Check attempt limit
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      // Invalidate the OTP
      await db
        .update(passwordResetOtps)
        .set({ usedAt: now })
        .where(eq(passwordResetOtps.id, otpRecord.id));

      return NextResponse.json(
        { error: 'Too many failed attempts. This code has been invalidated. Please request a new one.' },
        { status: 429 }
      );
    }

    // 4. Verify OTP hash
    const inputHash = await hashOtp(cleanOtp);
    if (inputHash !== otpRecord.otpHash) {
      const nextAttempts = otpRecord.attempts + 1;
      const isLockedNow = nextAttempts >= otpRecord.maxAttempts;

      await db
        .update(passwordResetOtps)
        .set({
          attempts: nextAttempts,
          usedAt: isLockedNow ? now : null,
        })
        .where(eq(passwordResetOtps.id, otpRecord.id));

      if (isLockedNow) {
        return NextResponse.json(
          { error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.' },
          { status: 429 }
        );
      }

      const remaining = otpRecord.maxAttempts - nextAttempts;
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      );
    }

    // 5. OTP is valid! Issue single-use resetToken valid for 15 minutes
    const resetToken = generateResetToken();
    const tokenExpiry = new Date(now.getTime() + 15 * 60 * 1000);

    await db
      .update(passwordResetOtps)
      .set({
        resetToken,
        expiresAt: tokenExpiry,
      })
      .where(eq(passwordResetOtps.id, otpRecord.id));

    return NextResponse.json({
      success: true,
      resetToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
