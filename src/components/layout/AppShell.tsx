'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { apiFetch } from '@/lib/api-client';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleNewNote = async () => {
    try {
      const res = await apiFetch<{ note: { id: string } }>('/api/v1/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '',
          plainText: '',
        }),
      });
      router.push(`/notes/${res.note.id}`);
    } catch (err) {
      console.error('Failed to create new note:', err);
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50/70">
      <Navbar onNewNote={handleNewNote} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onNewNote={handleNewNote} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
