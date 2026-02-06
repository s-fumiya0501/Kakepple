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
      // Single API call to get user + couple data
      const res = await authApi.me({ include_couple: true });
      const data = res.data;

      if (data.user) {
        setUser(data.user);
        setCouple(data.couple || null);
      } else {
        // Backward compatibility: response is the user object directly
        setUser(data);
        try {
          const coupleRes = await coupleApi.getMyCouple();
          setCouple(coupleRes.data);
        } catch {
          setCouple(null);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch auth data:', err);
      authToken.clearTokens();
      setUser(null);
      setError('Session expired');
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
