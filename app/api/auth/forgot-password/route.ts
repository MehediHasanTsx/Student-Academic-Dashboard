import { NextRequest, NextResponse } from 'next/server';
import { getServerDb } from '@/lib/db/server/db';
import { users, passwordResetOtps } from '@/lib/db/server/schema';
import { normalizeUsername, maskEmail } from '@/lib/auth/validation';
import { generateOtp, hashOtp } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/email/resend';
import { eq, and, gt } from 'drizzle-orm';

const GENERIC_RESPONSE = {
  success: true,
  message: 'If an account exists with this username, a verification code has been sent to the registered email address.',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawUsername = body?.username;

    if (!rawUsername || typeof rawUsername !== 'string') {
      return NextResponse.json(
        { error: 'Username is required.' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(rawUsername);
    const db = getServerDb();

    // 1. Look up user by normalized username
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    // Anti-account enumeration: return generic message if user not found or has no registered email
    if (!user || !user.email) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000);

    // 2. Check 60-second cooldown
    const recentOtp = await db
      .select({ id: passwordResetOtps.id, createdAt: passwordResetOtps.createdAt })
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          gt(passwordResetOtps.createdAt, sixtySecondsAgo)
        )
      )
      .limit(1);

    if (recentOtp.length > 0) {
      const waitSeconds = Math.ceil(
        (recentOtp[0].createdAt.getTime() + 60000 - now.getTime()) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds > 0 ? waitSeconds : 1}s before requesting a new code.`,
        },
        { status: 429 }
      );
    }

    // 3. Check hourly limit (max 5 requests per hour)
    const hourlyOtps = await db
      .select({ id: passwordResetOtps.id })
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          gt(passwordResetOtps.createdAt, oneHourAgo)
        )
      );

    if (hourlyOtps.length >= 5) {
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again after 1 hour.',
        },
        { status: 429 }
      );
    }

    // 4. Invalidate any existing unused OTPs for this user
    await db
      .update(passwordResetOtps)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          gt(passwordResetOtps.expiresAt, now)
        )
      );

    // 5. Generate secure 6-digit OTP and hash it
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // 6. Save hashed OTP to database
    await db.insert(passwordResetOtps).values({
      userId: user.id,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
    });

    // 7. Send OTP to registered email
    const emailResult = await sendOtpEmail({
      to: user.email,
      username: user.username,
      otp,
    });

    if (!emailResult.success) {
      console.error('[Forgot Password] Email delivery failed:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...GENERIC_RESPONSE,
        maskedEmail: maskEmail(user.email),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
