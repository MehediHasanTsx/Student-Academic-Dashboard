import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { users, passwordResetOtps } from '@/lib/db/server/schema';
import { hashPassword } from '@/lib/auth/password';
import { deleteAllUserSessions } from '@/lib/auth/session';
import { eq, and, gt, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resetToken, newPassword, confirmPassword } = body;

    // 1. Validation
    if (!resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: 'Password must be at most 128 characters.' },
        { status: 400 }
      );
    }

    const db = getServerDb();
    const now = new Date();

    // 2. Locate active OTP reset session by resetToken
    const [otpRecord] = await db
      .select()
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.resetToken, resetToken),
          isNull(passwordResetOtps.usedAt),
          gt(passwordResetOtps.expiresAt, now)
        )
      )
      .limit(1);

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset session. Please request a new code.' },
        { status: 400 }
      );
    }

    // 3. Mark the OTP session as used immediately (single-use)
    await db
      .update(passwordResetOtps)
      .set({ usedAt: now })
      .where(eq(passwordResetOtps.id, otpRecord.id));

    // 4. Hash new password and update user record
    const newHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: now,
      })
      .where(eq(users.id, otpRecord.userId));

    // 5. Invalidate all active user sessions upon password reset (security action)
    await deleteAllUserSessions(otpRecord.userId);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
