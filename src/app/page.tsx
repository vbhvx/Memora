'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api-client';
import {
  Sparkles,
  Pin,
  Clock,
  CheckSquare,
  Share2,
  FileText,
  ArrowRight,
  Plus,
  Tag as TagIcon,
  Folder as FolderIcon,
} from 'lucide-react';

interface NoteItem {
  id: string;
  title: string;
  plainText: string;
  isPinned: boolean;
  folderId: string | null;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  folder?: { id: string; name: string } | null;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  sourceNoteId: string | null;
  sourceNote?: { id: string; title: string };
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [quickTitle, setQuickTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const loadDashboardData = async () => {
    try {
      const [notesRes, tasksRes] = await Promise.all([
        apiFetch<{ notes: NoteItem[] }>('/api/v1/notes?limit=10'),
        apiFetch<{ tasks: TaskItem[] }>('/api/v1/tasks?status=todo'),
      ]);
      setNotes(notesRes.notes);
      setTasks(tasksRes.tasks);
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ note: NoteItem }>('/api/v1/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: quickTitle.trim(),
          content: '',
          plainText: '',
        }),
      });
      router.push(`/notes/${res.note.id}`);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleTaskToggle = async (taskId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
      await apiFetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading Memora...
      </div>
    );
  }

  const pinnedNotes = notes.filter((n) => n.isPinned);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Welcome & Quick Capture Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur-sm border border-indigo-400/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered Knowledge & Action Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-indigo-200">
              Capture thoughts once, find them when you need them, and turn ideas into actionable tasks.
            </p>

            {/* Quick Capture Box */}
            <form onSubmit={handleQuickCapture} className="pt-2 flex gap-2">
              <input
                type="text"
                placeholder="Quick capture: Type a thought, meeting, or idea..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white placeholder-indigo-200/60 border border-white/20 focus:outline-none focus:bg-white/20 focus:border-white/40 backdrop-blur-sm"
              />
              <button
                type="submit"
                disabled={isSubmitting || !quickTitle.trim()}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-900 shadow hover:bg-indigo-50 transition disabled:opacity-50"
              >
                Capture Note
              </button>
            </form>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Total Notes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{notes.length}</div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Pin className="h-4 w-4 text-amber-500" />
              <span>Pinned Notes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{pinnedNotes.length}</div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              <span>Open Tasks</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{tasks.length}</div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Share2 className="h-4 w-4 text-purple-600" />
              <span>Frictionless Sharing</span>
            </div>
            <div className="text-xs font-medium text-slate-600 mt-3">Guest Links Enabled</div>
          </div>
        </div>

        {/* Pinned Notes Grid */}
        {pinnedNotes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Pin className="h-4 w-4 text-amber-500" />
                <span>Pinned Notes</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pinnedNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="group rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs hover:border-amber-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                      {note.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3">
                      {note.plainText || 'No content yet...'}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <Pin className="h-3 w-3 text-amber-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Two Column Layout: Recent Notes & Pending Action Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Notes (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Recent Notes</span>
              </h2>
              <Link
                href="/notes"
                className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
              >
                View all notes <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition group"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 group-hover:text-indigo-600 truncate text-sm">
                        {note.title}
                      </h3>
                      {note.isPinned && <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-lg">
                      {note.plainText || 'Empty note'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                      {note.folder && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <FolderIcon className="h-2.5 w-2.5" />
                          <span>{note.folder.name}</span>
                        </span>
                      )}
                      {(note.tags || []).map((t) => (
                        <span
                          key={t.id}
                          className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600"
                        >
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
              ))}

              {notes.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No notes yet. Type an idea above to create your first note!
                </div>
              )}
            </div>
          </div>

          {/* Pending Action Tasks Widget (1 Col) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <span>Action Items</span>
              </h2>
              <Link
                href="/tasks"
                className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
              >
                All tasks <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition text-xs"
                >
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => handleTaskToggle(task.id, task.status)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="font-medium text-slate-800 line-clamp-2">{task.title}</div>
                    {task.sourceNote && (
                      <Link
                        href={`/notes/${task.sourceNote.id}`}
                        className="text-[11px] text-indigo-600 hover:underline block truncate"
                      >
                        Source: {task.sourceNote.title}
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No pending action items. Use AI task extraction inside any note to generate tasks!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
