'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Zap, X, Check, ArrowRight, Folder } from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (note: { id: string; title: string }) => void;
}

export function QuickCaptureModal({ isOpen, onClose, onSaved }: QuickCaptureModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [folderId, setFolderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setIsSaving(false);
      setTimeout(() => textareaRef.current?.focus(), 50);

      apiFetch<{ folders: Array<{ id: string; name: string }> }>('/api/v1/folders')
        .then((res) => setFolders(res.folders || []))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSave = async (openAfterSave = false) => {
    if (!content.trim() && !title.trim()) return;

    setIsSaving(true);
    try {
      // If title is empty, derive from first line or default
      let finalTitle = title.trim();
      if (!finalTitle) {
        const firstLine = content.trim().split('\n')[0]?.trim();
        finalTitle = firstLine ? firstLine.slice(0, 50) : 'Quick Note';
      }

      const res = await apiFetch<{ note: { id: string; title: string } }>('/api/v1/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: finalTitle,
          content: `<p>${content.replace(/\n/g, '<br/>')}</p>`,
          plainText: content,
          folderId: folderId || null,
        }),
      });

      if (onSaved) onSaved(res.note);
      onClose();

      if (openAfterSave) {
        router.push(`/notes/${res.note.id}`);
      }
    } catch (err: any) {
      alert(`Failed to save quick note: ${err.message}`);
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave(false);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-white">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Quick Capture Scratchpad
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:text-black hover:bg-neutral-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Note Body Form */}
        <div className="p-5 space-y-3">
          <input
            type="text"
            placeholder="Title (optional, auto-derives from first line)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 border-none bg-transparent focus:outline-none"
          />

          <textarea
            ref={textareaRef}
            placeholder="Type your thought, meeting note, or idea here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full text-xs text-neutral-800 placeholder:text-neutral-400 border border-neutral-200 rounded-xl p-3 bg-neutral-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black resize-none"
          />

          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-600 bg-neutral-100 px-2 py-1 rounded-lg">
              <Folder className="h-3.5 w-3.5 text-neutral-500" />
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="">Inbox (No Folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-neutral-400">
              <kbd className="font-mono bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200 text-[10px]">
                ⌘ + Enter
              </kbd>{' '}
              to save
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-black font-medium transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving || (!content.trim() && !title.trim())}
              onClick={() => handleSave(true)}
              className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition"
            >
              <span>Save & Open</span>
              <ArrowRight className="h-3 w-3" />
            </button>

            <button
              type="button"
              disabled={isSaving || (!content.trim() && !title.trim())}
              onClick={() => handleSave(false)}
              className="flex items-center gap-1 rounded-lg bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition"
            >
              <Check className="h-3 w-3" />
              <span>{isSaving ? 'Saving...' : 'Save to Inbox'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
