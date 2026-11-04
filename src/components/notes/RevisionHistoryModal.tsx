'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { History, X, RotateCcw, Check, Calendar, Clock } from 'lucide-react';

interface Revision {
  id: string;
  version: number;
  titleSnapshot: string;
  contentSnapshot: string;
  plainTextSnapshot: string;
  createdAt: string;
}

interface RevisionHistoryModalProps {
  noteId: string;
  currentVersion: number;
  onClose: () => void;
  onRestored: () => void;
}

export function RevisionHistoryModal({
  noteId,
  currentVersion,
  onClose,
  onRestored,
}: RevisionHistoryModalProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ revisions: Revision[] }>(`/api/v1/notes/${noteId}/revisions`)
      .then((data) => {
        setRevisions(data.revisions);
        if (data.revisions.length > 0) {
          setSelectedRevision(data.revisions[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [noteId]);

  const handleRollback = async (revision: Revision) => {
    if (
      !confirm(
        `Are you sure you want to restore Version ${revision.version}? Your current note content will be replaced with this snapshot.`
      )
    ) {
      return;
    }

    setRestoring(true);
    try {
      await apiFetch(`/api/v1/notes/${noteId}/revisions/${revision.id}/rollback`, {
        method: 'POST',
      });
      onRestored();
      onClose();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-zinc-800" />
            <h3 className="font-semibold text-zinc-900">Revision History</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">Loading revision snapshots...</div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Revisions List Sidebar */}
            <div className="w-1/3 border-r border-zinc-200 overflow-y-auto p-3 space-y-1.5 bg-zinc-50/50">
              {revisions.map((rev) => {
                const isCurrent = rev.version === currentVersion;
                const isSelected = selectedRevision?.id === rev.id;

                return (
                  <button
                    key={rev.id}
                    onClick={() => setSelectedRevision(rev)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                      isSelected
                        ? 'bg-white border-zinc-900 shadow-xs'
                        : 'bg-white/60 border-zinc-200 hover:bg-white text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-zinc-900">Version {rev.version}</span>
                      {isCurrent && (
                        <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-1">
                      {rev.titleSnapshot || 'Untitled'}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(rev.createdAt).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}

              {revisions.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-400 italic">
                  No revisions found.
                </div>
              )}
            </div>

            {/* Selected Snapshot Preview */}
            <div className="w-2/3 p-6 overflow-y-auto space-y-4 flex flex-col justify-between">
              {selectedRevision ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Snapshot Preview
                      </span>
                      <h4 className="text-lg font-bold text-zinc-900">
                        {selectedRevision.titleSnapshot || 'Untitled'}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Saved on {new Date(selectedRevision.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {selectedRevision.version !== currentVersion && (
                      <button
                        onClick={() => handleRollback(selectedRevision)}
                        disabled={restoring}
                        className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{restoring ? 'Restoring...' : 'Restore This Version'}</span>
                      </button>
                    )}
                  </div>

                  <div
                    className="prose prose-sm prose-zinc max-w-none text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-100 min-h-[220px]"
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedRevision.contentSnapshot ||
                        `<p class="italic text-zinc-400">${selectedRevision.plainTextSnapshot || 'Empty snapshot'}</p>`,
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-xs text-zinc-400 py-12">
                  Select a revision snapshot from the left to preview.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
