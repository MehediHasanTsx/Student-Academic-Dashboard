'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';

type ResetStep = 'USERNAME' | 'OTP' | 'PASSWORD' | 'SUCCESS';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>('USERNAME');
  const [username, setUsername] = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // 60-second cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Step 1: Request OTP ─────────────────────────────
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      setError('Please enter your username.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.forgotPassword({ username: trimmedUsername });
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setMaskedEmail(res.maskedEmail ?? null);
        setStep('OTP');
        setResendCooldown(60);
        toast.success('Verification code sent to your registered email.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend Code Action ──────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await authClient.forgotPassword({ username: username.trim().toLowerCase() });
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setResendCooldown(60);
        toast.success('A new verification code has been sent!');
      }
    } catch {
      toast.error('Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the 6-digit numerical code.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.verifyOtp({
        username: username.trim().toLowerCase(),
        otp: cleanOtp,
      });

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else if (res.resetToken) {
        setResetToken(res.resetToken);
        setStep('PASSWORD');
        toast.success('Code verified successfully.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ──────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.resetPassword({
        resetToken,
        newPassword,
        confirmPassword,
      });

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setStep('SUCCESS');
        toast.success('Password updated successfully!');
      }
    } catch {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">DCC CSE</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Academic Dashboard &bull; Password Recovery
          </p>
        </div>

        <Card>
          {/* STEP 1: Enter Username */}
          {step === 'USERNAME' && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Forgot Password</CardTitle>
                <CardDescription>
                  Enter your username to receive a 6-digit verification code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="forgot-username">Username</Label>
                    <Input
                      id="forgot-username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finding account...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Verification Code
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <Link
                      href="/login"
                      className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors hover:underline"
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Back to Login
                    </Link>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* STEP 2: Enter 6-digit OTP */}
          {step === 'OTP' && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Enter Verification Code</CardTitle>
                <CardDescription>
                  {maskedEmail ? (
                    <span>
                      We sent a 6-digit code to{' '}
                      <strong className="text-foreground">{maskedEmail}</strong>.
                    </span>
                  ) : (
                    <span>
                      If an account exists, a 6-digit code was sent to your registered email.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2 text-center">
                    <Label htmlFor="otp-input" className="text-xs text-muted-foreground">
                      6-Digit Code (valid for 10 minutes)
                    </Label>
                    <Input
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl font-mono tracking-[0.5em] font-semibold h-12"
                      autoFocus
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying code...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Verify Code
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('USERNAME');
                        setError('');
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
                    >
                      Change Username
                    </button>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || loading}
                      className="inline-flex items-center text-primary disabled:text-muted-foreground hover:underline transition-colors disabled:no-underline"
                    >
                      <RotateCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                      {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 'PASSWORD' && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Create New Password</CardTitle>
                <CardDescription>
                  Enter a new strong password for <strong className="text-foreground">@{username}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* STEP 4: Success Message */}
          {step === 'SUCCESS' && (
            <>
              <CardContent className="pt-6 pb-6 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Password Reset Complete</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your password has been successfully updated. All previous sessions have been safely logged out.
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  You can now log in using your username <strong className="font-mono text-foreground">{username}</strong> and new password.
                </div>
                <Button
                  onClick={() => router.replace('/login')}
                  className="w-full"
                >
                  Return to Login
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-[0.65rem] text-muted-foreground/50">
          Built by{' '}
          <a
            href="https://api.whatsapp.com/send/?phone=8801521743944&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
          >
            Mehedi Hasan
          </a>
        </p>
      </div>
    </div>
  );
}
