'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api-client';
import {
  FileText,
  Pin,
  Plus,
  Trash2,
  Copy,
  Upload,
  Archive,
  Folder,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { NoteImportModal } from '@/components/notes/NoteImportModal';

interface NoteItem {
  id: string;
  title: string;
  plainText: string;
  isPinned: boolean;
  archivedAt: string | null;
  folderId: string | null;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  folder?: { id: string; name: string } | null;
}

function NotesListContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allFolders, setAllFolders] = useState<Array<{ id: string; name: string }>>([]);

  const folderId = searchParams.get('folderId');
  const tagId = searchParams.get('tagId');
  const pinnedParam = searchParams.get('pinned');
  const archivedParam = searchParams.get('archived');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    apiFetch<{ folders: Array<{ id: string; name: string }> }>('/api/v1/folders')
      .then((res) => setAllFolders(res.folders || []))
      .catch(() => {});
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (folderId) qParams.set('folderId', folderId);
      if (tagId) qParams.set('tagId', tagId);
      if (pinnedParam) qParams.set('pinned', pinnedParam);
      if (archivedParam) qParams.set('archived', archivedParam);

      const res = await apiFetch<{ notes: NoteItem[] }>(`/api/v1/notes?${qParams.toString()}`);
      setNotes(res.notes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user, folderId, tagId, pinnedParam, archivedParam]);

  const handleCreateNote = async () => {
    try {
      const res = await apiFetch<{ note: NoteItem }>('/api/v1/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled Note',
          folderId: folderId || null,
        }),
      });
      router.push(`/notes/${res.note.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await apiFetch(`/api/v1/notes/${noteId}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setSelectedIds((prev) => prev.filter((id) => id !== noteId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await apiFetch<{ note: NoteItem }>(`/api/v1/notes/${noteId}/duplicate`, {
        method: 'POST',
      });
      setNotes((prev) => [res.note, ...prev]);
    } catch (err: any) {
      alert(`Failed to duplicate note: ${err.message}`);
    }
  };

  const toggleSelectNote = (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === notes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notes.map((n) => n.id));
    }
  };

  const handleBatchAction = async (
    action: 'archive' | 'unarchive' | 'move_folder' | 'trash',
    targetFolderId?: string | null
  ) => {
    if (action === 'trash' && !confirm(`Move ${selectedIds.length} notes to trash?`)) {
      return;
    }

    try {
      await apiFetch('/api/v1/notes/batch', {
        method: 'POST',
        body: JSON.stringify({
          noteIds: selectedIds,
          action,
          folderId: targetFolderId !== undefined ? targetFolderId : undefined,
        }),
      });
      setSelectedIds([]);
      loadNotes();
    } catch (err: any) {
      alert(`Batch operation failed: ${err.message}`);
    }
  };

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const titlePrefix = pinnedParam
    ? 'Pinned Notes'
    : archivedParam
    ? 'Archived Notes'
    : folderId
    ? 'Folder Notes'
    : tagId
    ? 'Tagged Notes'
    : 'All Notes';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-6 pb-24">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{titlePrefix}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
          </button>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-neutral-400 text-sm">Loading notes...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {notes.map((note) => {
            const isSelected = selectedIds.includes(note.id);

            return (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className={`group rounded-xl border bg-white p-5 shadow-xs transition flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-black ring-1 ring-black bg-neutral-50/50'
                    : 'border-neutral-200 hover:border-black hover:shadow-sm'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Checkbox for batch selection */}
                      <button
                        onClick={(e) => toggleSelectNote(note.id, e)}
                        className={`transition text-neutral-400 hover:text-black shrink-0 ${
                          isSelected || selectedIds.length > 0
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title={isSelected ? 'Deselect note' : 'Select note'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-black" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      <h3 className="font-semibold text-neutral-900 group-hover:text-black line-clamp-1 text-sm">
                        {note.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {note.isPinned && <Pin className="h-3.5 w-3.5 text-neutral-700" />}
                      <button
                        onClick={(e) => handleDuplicate(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-black transition"
                        title="Duplicate note"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-black transition"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                    {note.plainText || 'Empty note...'}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    {note.folder && (
                      <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] text-neutral-700 font-medium">
                        {note.folder.name}
                      </span>
                    )}
                    {(note.tags || []).slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded text-[10px] font-medium border border-neutral-200"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                  <span className="flex-shrink-0">{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </Link>
            );
          })}

          {notes.length === 0 && (
            <div className="col-span-full py-16 text-center space-y-3">
              <FileText className="h-10 w-10 text-neutral-300 mx-auto" />
              <p className="text-sm text-neutral-500">No notes found matching this view.</p>
              <button
                onClick={handleCreateNote}
                className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition"
              >
                Create a Note
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Batch Operations Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-neutral-700 flex flex-wrap items-center gap-3 text-xs animate-in slide-in-from-bottom-3 duration-150">
          <div className="flex items-center gap-2 pr-3 border-r border-neutral-700 font-medium">
            <span>{selectedIds.length} selected</span>
            <button
              onClick={handleSelectAll}
              className="text-neutral-400 hover:text-white underline text-[11px]"
            >
              {selectedIds.length === notes.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Move to Folder */}
            <div className="flex items-center gap-1.5 bg-neutral-800 px-2.5 py-1.5 rounded-lg border border-neutral-700">
              <Folder className="h-3.5 w-3.5 text-neutral-400" />
              <select
                onChange={(e) => {
                  if (e.target.value !== '') {
                    handleBatchAction('move_folder', e.target.value === 'inbox' ? null : e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="" disabled className="bg-neutral-900 text-neutral-400">Move to folder...</option>
                <option value="inbox" className="bg-neutral-900 text-white">Inbox (No folder)</option>
                {allFolders.map((f) => (
                  <option key={f.id} value={f.id} className="bg-neutral-900 text-white">
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Archive / Unarchive */}
            <button
              onClick={() => handleBatchAction(archivedParam ? 'unarchive' : 'archive')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>{archivedParam ? 'Unarchive' : 'Archive'}</span>
            </button>

            {/* Move to Trash */}
            <button
              onClick={() => handleBatchAction('trash')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/60 hover:text-red-200 border border-neutral-700 transition"
              title="Move selected to trash"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Trash</span>
            </button>

            {/* Close */}
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition ml-1"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isImportOpen && (
        <NoteImportModal
          onClose={() => setIsImportOpen(false)}
          onImportSuccess={(newNote) => {
            loadNotes();
            router.push(`/notes/${newNote.id}`);
          }}
        />
      )}
    </div>
  );
}

export default function NotesListPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Loading notes...</div>}>
        <NotesListContent />
      </Suspense>
    </AppShell>
  );
}
