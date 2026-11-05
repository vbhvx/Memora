'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserButton } from '@clerk/nextjs';
import {
  Plus,
  Search,
  LogOut,
  Sparkles,
} from 'lucide-react';

export function Navbar({
  onNewNote,
  onOpenCommandPalette,
}: {
  onNewNote?: () => void;
  onOpenCommandPalette?: () => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-black">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-xl tracking-tight font-extrabold text-neutral-900">Memora</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandPalette || (() => router.push('/search'))}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Search or jump to...</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-white border border-neutral-200 rounded">
            ⌘K
          </kbd>
        </button>

        {user ? (
          <>
            <button
              onClick={onNewNote}
              className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </button>

            <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
              {hasClerk ? (
                <div className="flex items-center gap-2">
                  <UserButton />
                  <span className="hidden md:inline text-xs font-medium text-neutral-700">{user.name}</span>
                </div>
              ) : (
                <>
                  <Link
                    href="/settings"
                    className="flex items-center gap-1.5 rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-100"
                    title="Settings"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 font-semibold text-xs border border-neutral-300">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:inline text-xs font-medium text-neutral-700">{user.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-black transition"
                    title="Log Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={hasClerk ? '/sign-in' : '/login'}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Sign In
            </Link>
            <Link
              href={hasClerk ? '/sign-up' : '/register'}
              className="rounded-lg bg-black px-3.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
