'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import {
  Share2,
  Copy,
  Check,
  X,
  Clock,
  ShieldCheck,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface ShareItem {
  id: string;
  noteId: string;
  permission: 'view' | 'comment' | 'edit';
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface SharingModalProps {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}

export function SharingModal({ noteId, noteTitle, onClose }: SharingModalProps) {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadShares = async () => {
    try {
      const data = await apiFetch<{ shares: ShareItem[] }>(`/api/v1/notes/${noteId}/shares`);
      setShares(data.shares);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadShares();
  }, [noteId]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNewShareUrl(null);
    try {
      const res = await apiFetch<{ share: { shareUrl: string; permission: string } }>(
        `/api/v1/notes/${noteId}/shares`,
        {
          method: 'POST',
          body: JSON.stringify({
            permission,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          }),
        }
      );
      setNewShareUrl(res.share.shareUrl);
      loadShares();
    } catch (err: any) {
      alert(`Failed to create share link: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this link? Anyone using it will immediately lose access.')) {
      return;
    }
    try {
      await apiFetch(`/api/v1/notes/${noteId}/shares/${shareId}`, {
        method: 'DELETE',
      });
      loadShares();
      if (newShareUrl) setNewShareUrl(null);
    } catch (err: any) {
      alert(`Failed to revoke share: ${err.message}`);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Share &ldquo;{noteTitle}&rdquo;</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Create New Link Section */}
          <form onSubmit={handleCreateShare} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Access Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['view', 'comment', 'edit'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPermission(p)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize text-center transition ${
                      permission === p
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p === 'view' && 'View Only'}
                    {p === 'comment' && 'Can Comment'}
                    {p === 'edit' && 'Can Edit'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Optional Expiration
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? 'Generating...' : 'Create Secure Share Link'}
            </button>
          </form>

          {/* Newly Generated Link Callout */}
          {newShareUrl && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Share Link Ready!</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Anyone possessing this link can access this note as a guest without creating an account.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newShareUrl}
                  className="flex-1 rounded border border-emerald-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(newShareUrl)}
                  className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Shares List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Share Links ({shares.filter((s) => !s.revokedAt).length})
            </h4>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {shares.map((s) => {
                const isRevoked = !!s.revokedAt;
                const isExpired = s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now();

                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <span className="capitalize px-1.5 py-0.5 bg-white border rounded text-[11px]">
                          {s.permission}
                        </span>
                        {isRevoked ? (
                          <span className="text-red-600 font-bold">Revoked</span>
                        ) : isExpired ? (
                          <span className="text-amber-600 font-bold">Expired</span>
                        ) : (
                          <span className="text-emerald-600">Active</span>
                        )}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Created {new Date(s.createdAt).toLocaleDateString()}
                        {s.expiresAt && ` · Expires ${new Date(s.expiresAt).toLocaleString()}`}
                      </div>
                    </div>

                    {!isRevoked && (
                      <button
                        onClick={() => handleRevokeShare(s.id)}
                        className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Revoke access immediately"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {shares.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">
                  No active share links. Create one above to share.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

