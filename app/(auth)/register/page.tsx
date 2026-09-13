'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Username availability
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Debounced username check
  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const result = await authClient.checkUsername(value);
      setUsernameAvailable(result.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (username.length < 3) {
      // Use setTimeout to make the setState async (avoids cascading render lint)
      const t = setTimeout(() => { if (active) setUsernameAvailable(null); }, 0);
      return () => { active = false; clearTimeout(t); };
    }
    const timeout = setTimeout(() => { if (active) checkUsername(username); }, 500);
    return () => { active = false; clearTimeout(timeout); };
  }, [username, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        username,
        mobile,
        password,
        confirmPassword,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success('Account created successfully!');
        router.replace('/onboarding');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
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
            Create your account
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create Account</CardTitle>
            <CardDescription>Sign up to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <div className="relative">
                  <Input
                    id="reg-username"
                    type="text"
                    placeholder="e.g., mehedi123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="pr-10"
                    required
                  />
                  {username.length >= 3 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : usernameAvailable === true ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : usernameAvailable === false ? (
                        <X className="h-4 w-4 text-red-500" />
                      ) : null}
                    </span>
                  )}
                </div>
                {usernameAvailable === false && (
                  <p className="text-xs text-destructive">Username already taken.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  3–30 characters. Letters, numbers, and underscores only.
                </p>
              </div>

              {/* Mobile */}
              <div className="space-y-2">
                <Label htmlFor="reg-mobile">Mobile Number</Label>
                <Input
                  id="reg-mobile"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  autoComplete="tel"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Bangladesh mobile number (e.g., 01712345678)
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                <Input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || usernameAvailable === false}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Login
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[0.65rem] text-muted-foreground/50">
          Built by{' '}
          <a href="mailto:mehedi.hasan.tsx@gmail.com" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
            mehedihasantsx
          </a>
        </p>
      </div>
    </div>
  );
}
