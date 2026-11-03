'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await apiFetch<{ user: User | null }>('/api/v1/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await apiFetch<{ user: User }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

