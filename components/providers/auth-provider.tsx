'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { authClient, type AuthUser } from '@/lib/auth/client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { username: string; password: string }) => Promise<{ error?: string }>;
  register: (data: {
    username: string;
    mobile: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Fetch user from session — called on mount and after login/register
  const refreshUser = useCallback(async () => {
    try {
      const result = await authClient.getMe();
      if (mountedRef.current) setUser(result.user ?? null);
    } catch {
      if (mountedRef.current) setUser(null);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    mountedRef.current = true;

    authClient.getMe().then((result) => {
      if (mountedRef.current) {
        setUser(result.user ?? null);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mountedRef.current) {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => { mountedRef.current = false; };
  }, []);

  const login = useCallback(async (data: { username: string; password: string }) => {
    const result = await authClient.login(data);
    if (result.error) {
      return { error: result.error };
    }
    setUser(result.user ?? null);
    return {};
  }, []);

  const register = useCallback(async (data: {
    username: string;
    mobile: string;
    password: string;
    confirmPassword: string;
  }) => {
    const result = await authClient.register(data);
    if (result.error) {
      return { error: result.error };
    }
    setUser(result.user ?? null);
    return {};
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext>
  );
}
