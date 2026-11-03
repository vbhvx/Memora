'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Plus,
  Search,
  BookOpen,
  LogOut,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';

export function Navbar({ onNewNote }: { onNewNote?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl tracking-tight">Memora</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-100 transition-colors"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <span className="hidden sm:inline">Search notes...</span>
        </Link>

        {user ? (
          <>
            <button
              onClick={onNewNote}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </button>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                title="Settings"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-xs font-medium text-slate-700">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

