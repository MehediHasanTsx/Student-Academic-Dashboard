/**
 * Auth client — used by client components to interact with auth API routes.
 * Never handles passwords directly beyond form submission.
 */

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  mobile: string;
  role: 'admin' | 'student';
}

interface AuthResponse {
  user?: AuthUser;
  error?: string;
}

interface UsernameCheckResponse {
  available: boolean;
  username?: string;
  reason?: string;
  error?: string;
}

interface ForgotPasswordResponse {
  success?: boolean;
  maskedEmail?: string | null;
  message?: string;
  error?: string;
}

interface VerifyOtpResponse {
  success?: boolean;
  resetToken?: string;
  error?: string;
}

interface ResetPasswordResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<T & { error?: string }> {
  const data = await response.json();
  if (!response.ok && !data.error) {
    return { ...data, error: 'An unexpected error occurred.' };
  }
  return data;
}

export const authClient = {
  /**
   * Register a new account.
   */
  async register(data: {
    username: string;
    email: string;
    mobile: string;
    password: string;
    confirmPassword: string;
  }): Promise<AuthResponse> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  /**
   * Log in with username and password.
   */
  async login(data: {
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(response);
  },

  /**
   * Log out the current session.
   */
  async logout(): Promise<{ success?: boolean; error?: string }> {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });
    return handleResponse(response);
  },

  /**
   * Get the currently authenticated user.
   */
  async getMe(): Promise<AuthResponse> {
    const response = await fetch('/api/auth/me');
    return handleResponse<AuthResponse>(response);
  },

  /**
   * Check if a username is available.
   */
  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    const response = await fetch(
      `/api/auth/check-username?u=${encodeURIComponent(username)}`
    );
    return handleResponse<UsernameCheckResponse>(response);
  },

  /**
   * Request password reset OTP.
   */
  async forgotPassword(data: { username: string }): Promise<ForgotPasswordResponse> {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ForgotPasswordResponse>(response);
  },

  /**
   * Verify the 6-digit OTP.
   */
  async verifyOtp(data: { username: string; otp: string }): Promise<VerifyOtpResponse> {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<VerifyOtpResponse>(response);
  },

  /**
   * Reset password with the verified token.
   */
  async resetPassword(data: {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ResetPasswordResponse> {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ResetPasswordResponse>(response);
  },
};
