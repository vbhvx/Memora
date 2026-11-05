'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api-client';
import { Trash2, RotateCcw, AlertTriangle, FileText } from 'lucide-react';

interface TrashNoteItem {
  id: string;
  title: string;
  plainText: string;
  deletedAt: string;
  updatedAt: string;
}

export default function TrashPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [trashNotes, setTrashNotes] = useState<TrashNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ notes: TrashNoteItem[] }>('/api/v1/notes?trash=true');
      setTrashNotes(res.notes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTrash();
    }
  }, [user]);

  const handleRestore = async (noteId: string, title: string) => {
    try {
      await apiFetch(`/api/v1/notes/${noteId}/restore`, { method: 'POST' });
      setTrashNotes((prev) => prev.filter((n) => n.id !== noteId));
      setActionNotice(`Restored "${title}" to your active notes.`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handlePermanentDelete = async (noteId: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/v1/notes/${noteId}?hard=true`, { method: 'DELETE' });
      setTrashNotes((prev) => prev.filter((n) => n.id !== noteId));
      setActionNotice(`Permanently deleted "${title}".`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center text-zinc-400">Loading...</div>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-zinc-600" />
              <span>Trash Bin</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Notes in the trash can be restored or permanently removed.
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-400">
            {trashNotes.length} {trashNotes.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {actionNotice && (
          <div className="p-3 bg-zinc-100 text-zinc-800 text-xs rounded-lg border border-zinc-200">
            {actionNotice}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-zinc-400 text-xs">Loading trash...</div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100 shadow-xs overflow-hidden">
            {trashNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/60 transition"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-semibold text-zinc-900 text-sm truncate">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {note.plainText || 'No content preview available'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRestore(note.id, note.title)}
                    className="flex items-center gap-1 bg-white border border-zinc-300 text-zinc-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(note.id, note.title)}
                    className="flex items-center gap-1 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-50 hover:border-red-300 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Forever</span>
                  </button>
                </div>
              </div>
            ))}

            {trashNotes.length === 0 && (
              <div className="p-16 text-center space-y-2">
                <Trash2 className="h-8 w-8 text-zinc-300 mx-auto" />
                <p className="text-sm font-medium text-zinc-600">Trash is empty</p>
                <p className="text-xs text-zinc-400">Notes you delete will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
