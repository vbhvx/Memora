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
  Trash2,
  Eye,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';

interface ShareItem {
  id: string;
  noteId: string;
  permission: 'view' | 'comment' | 'edit';
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

interface NoteCommentItem {
  id: string;
  guestDisplayName: string | null;
  content: string;
  createdAt: string;
}

interface SharingModalProps {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}

export function SharingModal({ noteId, noteTitle, onClose }: SharingModalProps) {
  const [activeTab, setActiveTab] = useState<'links' | 'comments'>('links');
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [comments, setComments] = useState<NoteCommentItem[]>([]);
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadShares = async () => {
    try {
      const data = await apiFetch<{ shares: ShareItem[] }>(`/api/v1/notes/${noteId}/shares`);
      setShares(data.shares);
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const data = await apiFetch<{ comments: NoteCommentItem[] }>(`/api/v1/notes/${noteId}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
    loadComments();
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

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this guest comment?')) {
      return;
    }
    try {
      await apiFetch(`/api/v1/notes/${noteId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(`Failed to delete comment: ${err.message}`);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-black" />
            <h3 className="font-semibold text-neutral-900 truncate max-w-xs">Share &ldquo;{noteTitle}&rdquo;</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'links'
                ? 'border-black text-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Links & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'comments'
                ? 'border-black text-black'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Guest Comments ({comments.length})</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'links' ? (
            <>
              {/* Create New Link Section */}
              <form onSubmit={handleCreateShare} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
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
                            ? 'border-black bg-neutral-900 text-white font-semibold'
                            : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                    Optional Expiration
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {loading ? 'Generating...' : 'Create Secure Share Link'}
                </button>
              </form>

              {/* Newly Generated Link Callout */}
              {newShareUrl && (
                <div className="rounded-lg border border-neutral-300 bg-neutral-100 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                    <ShieldCheck className="h-4 w-4 text-neutral-800" />
                    <span>Share Link Ready!</span>
                  </div>
                  <p className="text-[11px] text-neutral-700">
                    Anyone possessing this link can access this note as a guest without creating an account.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newShareUrl}
                      className="flex-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 font-mono select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newShareUrl)}
                      className="flex items-center gap-1 rounded bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Shares List & Telemetry */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Active Share Links ({shares.filter((s) => !s.revokedAt).length})
                </h4>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {shares.map((s) => {
                    const isRevoked = !!s.revokedAt;
                    const isExpired = s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now();

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 font-medium text-neutral-800">
                            <span className="capitalize px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[11px] font-semibold text-neutral-900">
                              {s.permission}
                            </span>
                            {isRevoked ? (
                              <span className="text-neutral-400 line-through font-bold">Revoked</span>
                            ) : isExpired ? (
                              <span className="text-neutral-500 font-bold">Expired</span>
                            ) : (
                              <span className="text-neutral-900 font-bold">Active</span>
                            )}

                            {/* Telemetry pill */}
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700 text-[10px] font-medium">
                              <Eye className="h-3 w-3" />
                              <span>{s.viewCount ?? 0} views</span>
                            </span>
                          </div>

                          <div className="text-neutral-400 text-[11px] truncate">
                            Created {new Date(s.createdAt).toLocaleDateString()}
                            {s.lastAccessedAt && ` · Last accessed ${new Date(s.lastAccessedAt).toLocaleDateString()}`}
                            {s.expiresAt && ` · Expires ${new Date(s.expiresAt).toLocaleDateString()}`}
                          </div>
                        </div>

                        {!isRevoked && (
                          <button
                            onClick={() => handleRevokeShare(s.id)}
                            className="rounded p-1 text-neutral-400 hover:text-black hover:bg-neutral-200 transition ml-2 shrink-0"
                            title="Revoke access immediately"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {shares.length === 0 && (
                    <p className="text-xs text-neutral-400 italic py-2">
                      No active share links. Create one above to share.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Guest Comments Moderation Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Review and moderate guest feedback left via share links.
                </span>
                <button
                  onClick={loadComments}
                  className="text-xs text-neutral-600 hover:text-black underline font-medium"
                >
                  Refresh
                </button>
              </div>

              {commentsLoading ? (
                <div className="py-8 text-center text-xs text-neutral-400">Loading feedback...</div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400 italic">
                  No guest comments on this note yet.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-lg p-2 bg-neutral-50/50">
                  {comments.map((c) => (
                    <div key={c.id} className="py-2.5 px-2 flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                          <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                          <span>{c.guestDisplayName || 'Guest Reader'}</span>
                          <span className="text-[10px] font-normal text-neutral-400">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 pl-5">{c.content}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded transition shrink-0"
                        title="Delete comment (moderate)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
