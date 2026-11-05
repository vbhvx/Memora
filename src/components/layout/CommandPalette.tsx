'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import {
  Search,
  Plus,
  FileText,
  CheckSquare,
  Trash2,
  Settings,
  LayoutDashboard,
  ArrowRight,
  Command,
} from 'lucide-react';

interface NoteResult {
  id: string;
  title: string;
  plainText: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewNote: () => void;
}

export function CommandPalette({ isOpen, onClose, onNewNote }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<NoteResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      // Load recent 5 notes
      apiFetch<{ notes: NoteResult[] }>('/api/v1/notes?limit=5')
        .then((res) => setNotes(res.notes || []))
        .catch(() => setNotes([]));
    } else {
      // Live search
      const timer = setTimeout(() => {
        apiFetch<{ results: NoteResult[] }>(`/api/v1/search?q=${encodeURIComponent(query)}&limit=6`)
          .then((res) => setNotes(res.results || []))
          .catch(() => setNotes([]));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [query, isOpen]);

  // Global static navigation actions
  const defaultActions = [
    {
      id: 'action-new',
      label: 'Create New Note',
      icon: Plus,
      run: () => {
        onClose();
        onNewNote();
      },
    },
    {
      id: 'action-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      run: () => {
        onClose();
        router.push('/');
      },
    },
    {
      id: 'action-notes',
      label: 'View All Notes',
      icon: FileText,
      run: () => {
        onClose();
        router.push('/notes');
      },
    },
    {
      id: 'action-tasks',
      label: 'Open Tasks & Actions',
      icon: CheckSquare,
      run: () => {
        onClose();
        router.push('/tasks');
      },
    },
    {
      id: 'action-trash',
      label: 'Open Trash',
      icon: Trash2,
      run: () => {
        onClose();
        router.push('/trash');
      },
    },
    {
      id: 'action-settings',
      label: 'Account & Settings',
      icon: Settings,
      run: () => {
        onClose();
        router.push('/settings');
      },
    },
  ];

  const filteredActions = query.trim()
    ? defaultActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : defaultActions;

  const totalItems = filteredActions.length + notes.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredActions.length) {
        filteredActions[selectedIndex]?.run();
      } else {
        const noteIdx = selectedIndex - filteredActions.length;
        const targetNote = notes[noteIdx];
        if (targetNote) {
          onClose();
          router.push(`/notes/${targetNote.id}`);
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-xs p-4 pt-20 animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 bg-zinc-50/50">
          <Search className="h-5 w-5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search notes..."
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Matching Actions */}
          {filteredActions.length > 0 && (
            <div className="space-y-0.5">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Actions
              </span>
              {filteredActions.map((action, idx) => {
                const Icon = action.icon;
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={action.id}
                    onClick={action.run}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                      isSelected
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                      <span className="font-medium">{action.label}</span>
                    </div>
                    <ArrowRight className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-zinc-300'}`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Notes Matching Query or Recent */}
          {notes.length > 0 && (
            <div className="space-y-0.5">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {query.trim() ? 'Matching Notes' : 'Recent Notes'}
              </span>
              {notes.map((note, idx) => {
                const itemIndex = filteredActions.length + idx;
                const isSelected = selectedIndex === itemIndex;

                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      onClose();
                      router.push(`/notes/${note.id}`);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition ${
                      isSelected
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="font-semibold truncate">
                      {note.title || 'Untitled Note'}
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        isSelected ? 'text-zinc-300' : 'text-zinc-400'
                      }`}
                    >
                      {note.plainText || 'No content preview'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {totalItems === 0 && (
            <div className="py-8 text-center text-xs text-zinc-400">
              No matching commands or notes found.
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Navigation: <kbd className="font-mono bg-white px-1 border rounded">↑</kbd> <kbd className="font-mono bg-white px-1 border rounded">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-white px-1 border rounded">↵</kbd></span>
          </div>
          <span>Memora Command Center</span>
        </div>
      </div>
    </div>
  );
}
