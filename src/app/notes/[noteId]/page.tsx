'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { NoteEditor, NoteData } from '@/components/notes/NoteEditor';
import { apiFetch } from '@/lib/api-client';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [note, setNote] = useState<NoteData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const noteId = params.noteId as string;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!noteId || !user) return;
    setIsFetching(true);
    apiFetch<{ note: NoteData }>(`/api/v1/notes/${noteId}`)
      .then((res) => {
        setNote(res.note);
      })
      .catch((err) => {
        setError(err.message || 'Note not found');
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [noteId, user]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await apiFetch(`/api/v1/notes/${noteId}`, { method: 'DELETE' });
      router.push('/notes');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (isLoading || isFetching) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
          Loading note...
        </div>
      </AppShell>
    );
  }

  if (error || !note) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto my-12 text-center space-y-4">
          <p className="text-red-600 font-semibold">{error || 'Note not found.'}</p>
          <button
            onClick={() => router.push('/notes')}
            className="rounded bg-black hover:bg-neutral-800 transition px-4 py-2 text-xs font-semibold text-white"
          >
            Back to Notes
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <NoteEditor initialNote={note} onDelete={handleDelete} />
    </AppShell>
  );
}

