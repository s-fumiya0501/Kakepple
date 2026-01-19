'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, coupleApi } from '@/lib/api';
import { authToken } from '@/lib/auth';
import { User, Couple } from '@/types';

interface AuthContextType {
  user: User | null;
  couple: Couple | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  refreshCouple: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserAndCouple = useCallback(async () => {
    // Check if we have a token before making requests
    if (!authToken.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user and couple data in parallel
      const [userRes, coupleRes] = await Promise.allSettled([
        authApi.me(),
        coupleApi.getMyCouple(),
      ]);

      if (userRes.status === 'fulfilled') {
        setUser(userRes.value.data);
      } else {
        // If user fetch fails, clear tokens and redirect
        authToken.clearTokens();
        setUser(null);
        setError('Session expired');
        return;
      }

      if (coupleRes.status === 'fulfilled') {
        setCouple(coupleRes.value.data);
      } else {
        setCouple(null);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch auth data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const refreshCouple = useCallback(async () => {
    try {
      const res = await coupleApi.getMyCouple();
      setCouple(res.data);
    } catch (err) {
      setCouple(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      authToken.clearTokens();
      setUser(null);
      setCouple(null);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    fetchUserAndCouple();
  }, [fetchUserAndCouple]);

  return (
    <AuthContext.Provider
      value={{
        user,
        couple,
        loading,
        error,
        refreshUser,
        refreshCouple,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
