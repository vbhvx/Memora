'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  User as UserIcon,
  Shield,
  Sparkles,
  Lock,
  LogOut,
  Info,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings & Account</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your profile, security preferences, and AI processing settings.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-indigo-600" />
            <span>Profile Details</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Full Name</span>
              <span className="font-semibold text-slate-800 text-sm">{user.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Email Address</span>
              <span className="font-semibold text-slate-800 text-sm">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Privacy & AI Processing Notice */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>AI Architecture & Privacy Boundaries</span>
          </h2>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2 bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 text-indigo-950">
              <Info className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Explicit Triggering:</strong> AI features (title suggestion, summarization,
                and task extraction) are executed strictly on user demand. Memora never sends data to
                AI models on arbitrary keystrokes.
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p>
                <strong>Server-Side Processing:</strong> Secret API keys are strictly maintained on
                the backend and never exposed to the client browser.
              </p>
              <p>
                <strong>Provider Agnostic Adapter:</strong> Supports Gemini, OpenAI, Anthropic, or
                an internal deterministic heuristic engine without external runtime dependencies.
              </p>
              <p>
                <strong>Data Retention:</strong> AI processing does not make private notes publicly
                accessible. External provider retention follows the chosen provider&apos;s API terms.
              </p>
            </div>
          </div>
        </div>

        {/* Sharing Security Model */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span>Sharing & Access Control Model</span>
          </h2>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              <strong>Cryptographic Share Tokens:</strong> Share links utilize 256-bit cryptographically
              random tokens. The database stores only SHA-256 hashes of usable tokens, preventing
              token enumeration and database leaks.
            </p>
            <p>
              <strong>Immediate Revocation:</strong> Revoking a share link immediately rejects any subsequent
              requests from guests.
            </p>
            <p>
              <strong>Strict Guest Isolation:</strong> Guest links permit viewing or commenting solely on
              the individual shared note. Guests cannot discover the owner&apos;s other notes, folder
              hierarchy, or account data.
            </p>
          </div>
        </div>

        {/* Session & Logout */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Account Session</h3>
            <p className="text-xs text-slate-500">Sign out of your active session on this device.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}

