'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, ClientApiError } from '@/lib/api-client';
import {
  Sparkles,
  Eye,
  MessageSquare,
  Edit3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  User as UserIcon,
  Shield,
} from 'lucide-react';

interface SharedData {
  permission: 'view' | 'comment' | 'edit';
  expiresAt: string | null;
  note: {
    id: string;
    title: string;
    content: string;
    plainText: string;
    version: number;
    updatedAt: string;
  };
  comments?: Array<{
    id: string;
    guestDisplayName: string | null;
    content: string;
    createdAt: string;
  }>;
}

export default function SharedNotePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  // Guest comment state
  const [guestName, setGuestName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Guest edit state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'failed' | 'conflict'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionRef = useRef(1);

  const loadSharedNote = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SharedData>(`/api/v1/shared/${token}`);
      setData(res);
      setEditTitle(res.note.title);
      setEditContent(res.note.content);
      versionRef.current = res.note.version;
    } catch (err: any) {
      if (err instanceof ClientApiError) {
        setError({ code: err.code, message: err.message });
      } else {
        setError({ code: 'ERROR', message: 'Unable to access shared note.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSharedNote();
    }
  }, [token]);

  // Guest edit autosave
  const handleEditChange = (newTitle: string, newContent: string) => {
    setEditTitle(newTitle);
    setEditContent(newContent);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch<{ note: { version: number; updatedAt: string } }>(
          `/api/v1/shared/${token}/edit`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              title: newTitle,
              content: newContent,
              plainText: newContent.replace(/<[^>]+>/g, ' '),
              version: versionRef.current,
            }),
          }
        );
        versionRef.current = res.note.version;
        setSaveStatus('saved');
      } catch (err: any) {
        if (err instanceof ClientApiError && err.code === 'CONFLICT') {
          setSaveStatus('conflict');
        } else {
          setSaveStatus('failed');
        }
      }
    }, 800);
  };

  // Guest comment submission
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await apiFetch<{
        comment: {
          id: string;
          guestDisplayName: string | null;
          content: string;
          createdAt: string;
        };
      }>(`/api/v1/shared/${token}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          guestDisplayName: guestName.trim() || undefined,
          content: commentContent.trim(),
        }),
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              comments: [res.comment, ...(prev.comments || [])],
            }
          : prev
      );
      setCommentContent('');
    } catch (err: any) {
      alert(`Failed to post comment: ${err.message}`);
    } finally {
      setIsPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Loading shared note...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {error?.code === 'EXPIRED'
              ? 'Share Link Expired'
              : error?.code === 'REVOKED'
              ? 'Access Revoked'
              : 'Note Unavailable'}
          </h1>
          <p className="text-xs text-slate-500">
            {error?.message || 'This note is no longer accessible via this link.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Top Banner disclosing permission & guest state */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
            M
          </div>
          <span className="font-bold text-neutral-900 tracking-tight">Memora</span>
          <span className="text-neutral-300">|</span>
          <span className="text-xs text-neutral-500">Shared Note</span>
        </div>

        {/* Permission Disclosure Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-900">
            {data.permission === 'view' && <Eye className="h-3.5 w-3.5" />}
            {data.permission === 'comment' && <MessageSquare className="h-3.5 w-3.5" />}
            {data.permission === 'edit' && <Edit3 className="h-3.5 w-3.5" />}
            <span className="capitalize">
              {data.permission === 'view'
                ? 'View Only'
                : data.permission === 'comment'
                ? 'Can Comment'
                : 'Can Edit'}
            </span>
          </div>

          {data.permission === 'edit' && (
            <div className="text-xs">
              {saveStatus === 'saving' && (
                <span className="text-neutral-600 flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-neutral-900 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-neutral-800" /> Saved
                </span>
              )}
              {saveStatus === 'conflict' && (
                <span className="text-neutral-900 font-bold">Conflict detected!</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-10 shadow-xs space-y-6">
          {data.permission === 'edit' ? (
            /* Editable Mode */
            <div className="space-y-4">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => handleEditChange(e.target.value, editContent)}
                className="w-full text-2xl sm:text-3xl font-extrabold text-neutral-900 border-none bg-transparent focus:outline-none"
              />
              <textarea
                value={editContent}
                onChange={(e) => handleEditChange(editTitle, e.target.value)}
                rows={14}
                className="w-full border border-neutral-300 rounded-lg p-3 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black font-sans"
              />
            </div>
          ) : (
            /* Read-Only Mode */
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                {data.note.title}
              </h1>
              <div
                className="prose prose-neutral max-w-none text-neutral-800 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: data.note.content || `<p>${data.note.plainText}</p>`,
                }}
              />
            </div>
          )}

          <div className="pt-6 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
            <span>Last updated {new Date(data.note.updatedAt).toLocaleDateString()}</span>
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-neutral-400" /> Secure Guest Access
            </span>
          </div>
        </div>

        {/* Comment Section (If permission is comment or edit) */}
        {(data.permission === 'comment' || data.permission === 'edit') && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-neutral-800" />
              <span>Comments ({data.comments?.length || 0})</span>
            </h3>

            {/* Post Comment Form */}
            <form onSubmit={handlePostComment} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Your Name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment or feedback..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  type="submit"
                  disabled={isPostingComment || !commentContent.trim()}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="divide-y divide-slate-100">
              {(data.comments || []).map((comment) => (
                <div key={comment.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <UserIcon className="h-3 w-3 text-slate-400" />
                      <span>{comment.guestDisplayName || 'Guest Reader'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 pl-4">{comment.content}</p>
                </div>
              ))}

              {(!data.comments || data.comments.length === 0) && (
                <p className="text-xs text-slate-400 italic py-4">
                  No comments yet. Be the first to leave feedback!
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

