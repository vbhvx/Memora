'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { apiFetch } from '@/lib/api-client';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <Navbar
        onNewNote={handleNewNote}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onNewNote={handleNewNote} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNewNote={handleNewNote}
      />
    </div>
  );
}
