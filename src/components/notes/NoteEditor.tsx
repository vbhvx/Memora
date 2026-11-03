'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { apiFetch, ClientApiError } from '@/lib/api-client';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Sparkles,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Share2,
  Pin,
  Archive,
  Tag as TagIcon,
  Folder as FolderIcon,
  Trash2,
  Check,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { SharingModal } from './SharingModal';

export type SaveStatus = 'saved' | 'saving' | 'failed' | 'conflict' | 'offline';

export interface NoteData {
  id: string;
  title: string;
  content: string;
  plainText: string;
  version: number;
  folderId: string | null;
  isPinned: boolean;
  archivedAt: string | null;
  updatedAt: string;
  tags?: Array<{ id: string; name: string }>;
  folder?: { id: string; name: string } | null;
}

interface NoteEditorProps {
  initialNote: NoteData;
  onDelete?: () => void;
}

export function NoteEditor({ initialNote, onDelete }: NoteEditorProps) {
  const [note, setNote] = useState<NoteData>(initialNote);
  const [title, setTitle] = useState(initialNote.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Folders & Tags
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Modals & Panels
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // AI Review States
  const [titleSuggestion, setTitleSuggestion] = useState<{ title: string; sourceVersion: number } | null>(null);
  const [summarySuggestion, setSummarySuggestion] = useState<{ summary: string; keyPoints: string[]; sourceVersion: number } | null>(null);
  const [actionSuggestions, setActionSuggestions] = useState<Array<{
    title: string;
    description: string | null;
    assigneeName: string | null;
    dueDateText: string | null;
    confidence: number;
    sourceExcerpt: string;
    selected: boolean;
  }> | null>(null);
  const [actionSourceVersion, setActionSourceVersion] = useState<number | null>(null);
  const [tasksCreatedNotice, setTasksCreatedNotice] = useState<string | null>(null);

  // Version tracking ref for debouncing & concurrency
  const noteVersionRef = useRef(initialNote.version);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Load user's folders and tags
  useEffect(() => {
    Promise.all([
      apiFetch<{ folders: Array<{ id: string; name: string }> }>('/api/v1/folders'),
      apiFetch<{ tags: Array<{ id: string; name: string }> }>('/api/v1/tags'),
    ])
      .then(([f, t]) => {
        setFolders(f.folders);
        setTags(t.tags);
      })
      .catch(() => {});
  }, []);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing your note, meeting minutes, or project plan...',
      }),
    ],
    content: initialNote.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none focus:outline-none min-h-[400px] text-neutral-900',
      },
    },
    onUpdate: () => {
      if (isInitialMount.current) return;
      triggerAutoSave();
    },
  });

  // Track initial mount to prevent immediate autosave on load
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // Update plain text and save to server
  const saveChanges = useCallback(
    async (overrideTitle?: string) => {
      if (!editor) return;

      const currentHtml = editor.getHTML();
      const currentText = editor.getText();
      const currentTitle = overrideTitle !== undefined ? overrideTitle : title;

      setSaveStatus('saving');
      setErrorMessage(null);

      try {
        const res = await apiFetch<{ note: NoteData }>(`/api/v1/notes/${note.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: currentTitle,
            content: currentHtml,
            plainText: currentText,
            version: noteVersionRef.current,
          }),
        });

        noteVersionRef.current = res.note.version;
        setNote((prev) => ({
          ...prev,
          version: res.note.version,
          updatedAt: res.note.updatedAt,
        }));
        setSaveStatus('saved');
      } catch (err: any) {
        if (err instanceof ClientApiError && err.code === 'CONFLICT') {
          setSaveStatus('conflict');
          setErrorMessage('A conflict was detected: Note was updated elsewhere.');
        } else {
          setSaveStatus('failed');
          setErrorMessage(err.message || 'Failed to save changes.');
        }
      }
    },
    [editor, title, note.id]
  );

  const triggerAutoSave = () => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, 800);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    triggerAutoSave();
  };

  // Folder assignment
  const handleFolderChange = async (folderId: string | null) => {
    try {
      const res = await apiFetch<{ note: NoteData }>(`/api/v1/notes/${note.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          folderId: folderId || null,
          version: noteVersionRef.current,
        }),
      });
      noteVersionRef.current = res.note.version;
      setNote((prev) => ({ ...prev, folderId: res.note.folderId, version: res.note.version }));
    } catch (err) {
      console.error(err);
    }
  };

  // Pin toggle
  const handlePinToggle = async () => {
    try {
      const nextPinned = !note.isPinned;
      const res = await apiFetch<{ note: NoteData }>(`/api/v1/notes/${note.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isPinned: nextPinned,
          version: noteVersionRef.current,
        }),
      });
      noteVersionRef.current = res.note.version;
      setNote((prev) => ({ ...prev, isPinned: nextPinned, version: res.note.version }));
    } catch (err) {
      console.error(err);
    }
  };

  // Archive toggle
  const handleArchiveToggle = async () => {
    try {
      const isCurrentlyArchived = !!note.archivedAt;
      const res = await apiFetch<{ note: NoteData }>(`/api/v1/notes/${note.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isArchived: !isCurrentlyArchived,
          version: noteVersionRef.current,
        }),
      });
      noteVersionRef.current = res.note.version;
      setNote((prev) => ({ ...prev, archivedAt: res.note.archivedAt, version: res.note.version }));
    } catch (err) {
      console.error(err);
    }
  };

  // Tag assignment
  const handleAddTag = async (tagId: string) => {
    const currentTagIds = (note.tags || []).map((t) => t.id);
    if (currentTagIds.includes(tagId)) return;
    const nextTagIds = [...currentTagIds, tagId];
    try {
      await apiFetch(`/api/v1/notes/${note.id}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tagIds: nextTagIds }),
      });
      const selectedTag = tags.find((t) => t.id === tagId);
      if (selectedTag) {
        setNote((prev) => ({ ...prev, tags: [...(prev.tags || []), selectedTag] }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const nextTagIds = (note.tags || []).filter((t) => t.id !== tagId).map((t) => t.id);
    try {
      await apiFetch(`/api/v1/notes/${note.id}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tagIds: nextTagIds }),
      });
      setNote((prev) => ({ ...prev, tags: (prev.tags || []).filter((t) => t.id !== tagId) }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAndAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    try {
      const res = await apiFetch<{ tag: { id: string; name: string } }>('/api/v1/tags', {
        method: 'POST',
        body: JSON.stringify({ name: newTagInput.trim() }),
      });
      setTags((prev) => [...prev.filter((t) => t.id !== res.tag.id), res.tag]);
      handleAddTag(res.tag.id);
      setNewTagInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------
  // AI Actions (Title, Summary, Actions)
  // ----------------------------------------
  const handleAiSuggestTitle = async () => {
    setIsAiLoading(true);
    try {
      const res = await apiFetch<{
        suggestion: { title: string; explanation?: string };
        sourceVersion: number;
      }>(`/api/v1/notes/${note.id}/ai/title`, { method: 'POST' });
      setTitleSuggestion({ title: res.suggestion.title, sourceVersion: res.sourceVersion });
    } catch (err: any) {
      alert(`AI Title suggestion error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyTitleSuggestion = () => {
    if (!titleSuggestion) return;
    setTitle(titleSuggestion.title);
    saveChanges(titleSuggestion.title);
    setTitleSuggestion(null);
  };

  const handleAiSummarize = async () => {
    setIsAiLoading(true);
    try {
      const res = await apiFetch<{
        summary: { summary: string; keyPoints: string[] };
        sourceVersion: number;
      }>(`/api/v1/notes/${note.id}/ai/summary`, { method: 'POST' });
      setSummarySuggestion({
        summary: res.summary.summary,
        keyPoints: res.summary.keyPoints || [],
        sourceVersion: res.sourceVersion,
      });
    } catch (err: any) {
      alert(`AI Summarize error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiExtractActions = async () => {
    setIsAiLoading(true);
    setTasksCreatedNotice(null);
    try {
      const res = await apiFetch<{
        actions: Array<{
          title: string;
          description: string | null;
          assigneeName: string | null;
          dueDateText: string | null;
          confidence: number;
          sourceExcerpt: string;
        }>;
        sourceVersion: number;
      }>(`/api/v1/notes/${note.id}/ai/actions`, { method: 'POST' });

      setActionSuggestions(
        res.actions.map((item) => ({
          ...item,
          selected: true, // selected by default for review
        }))
      );
      setActionSourceVersion(res.sourceVersion);
    } catch (err: any) {
      alert(`AI Task Extraction error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCreateApprovedTasks = async () => {
    if (!actionSuggestions) return;
    const selected = actionSuggestions.filter((i) => i.selected);
    if (selected.length === 0) return;

    try {
      const res = await apiFetch<{ createdCount: number }>('/api/v1/tasks/from-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          sourceNoteId: note.id,
          sourceRevisionId: null,
          items: selected.map((i) => ({
            title: i.title,
            description: i.description,
            assigneeName: i.assigneeName,
            dueDateText: i.dueDateText,
          })),
        }),
      });

      setTasksCreatedNotice(`Successfully converted ${res.createdCount} action items into active tasks!`);
      setActionSuggestions(null);
    } catch (err: any) {
      alert(`Task creation error: ${err.message}`);
    }
  };

  // Reload note in case of conflict
  const handleReloadNote = async () => {
    try {
      const res = await apiFetch<{ note: NoteData }>(`/api/v1/notes/${note.id}`);
      setNote(res.note);
      setTitle(res.note.title);
      noteVersionRef.current = res.note.version;
      editor?.commands.setContent(res.note.content || '');
      setSaveStatus('saved');
      setErrorMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!editor) {
    return <div className="p-8 text-center text-slate-400">Loading editor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-4">
      {/* Top Header & Save Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-3">
          {/* Status Indicator Badge */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-300">
                <Clock className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-300 font-medium">
                <CheckCircle className="h-3 w-3 text-neutral-800" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'failed' && (
              <span className="flex items-center gap-1 text-neutral-900 bg-neutral-200 px-2 py-0.5 rounded-full border border-neutral-400">
                <AlertTriangle className="h-3 w-3" />
                <span>Save failed</span>
                <button onClick={() => saveChanges()} className="underline ml-1 font-bold">
                  Retry
                </button>
              </span>
            )}
            {saveStatus === 'conflict' && (
              <span className="flex items-center gap-1 text-neutral-900 bg-neutral-200 px-2 py-0.5 rounded-full border border-neutral-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Conflict detected</span>
                <button
                  onClick={handleReloadNote}
                  className="underline ml-1 font-bold text-black hover:text-neutral-800"
                >
                  Reload Latest
                </button>
              </span>
            )}
          </div>

          <span className="text-xs text-neutral-400">v{note.version}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePinToggle}
            className={`p-1.5 rounded-lg border text-xs transition ${
              note.isPinned
                ? 'bg-black text-white border-black'
                : 'text-neutral-600 border-neutral-300 hover:bg-neutral-100'
            }`}
            title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
          >
            <Pin className="h-4 w-4" />
          </button>

          <button
            onClick={handleArchiveToggle}
            className={`p-1.5 rounded-lg border text-xs transition ${
              note.archivedAt
                ? 'bg-black text-white border-black'
                : 'text-neutral-600 border-neutral-300 hover:bg-neutral-100'
            }`}
            title={note.archivedAt ? 'Unarchive Note' : 'Archive Note'}
          >
            <Archive className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 shadow-xs transition"
          >
            <Share2 className="h-3.5 w-3.5 text-neutral-500" />
            <span>Share</span>
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-black hover:border-neutral-400 hover:bg-neutral-100 text-xs transition"
              title="Delete Note"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title Input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled Note"
          className="w-full text-2xl sm:text-3xl font-extrabold text-neutral-900 placeholder:text-neutral-300 border-none bg-transparent focus:outline-none"
        />
      </div>

      {/* Meta Selector Bar: Folder & Tags */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 bg-neutral-100/70 p-2.5 rounded-lg border border-neutral-200">
        <div className="flex items-center gap-1.5">
          <FolderIcon className="h-3.5 w-3.5 text-neutral-500" />
          <select
            value={note.folderId || ''}
            onChange={(e) => handleFolderChange(e.target.value || null)}
            className="bg-transparent border-none text-xs font-medium text-neutral-800 focus:outline-none cursor-pointer"
          >
            <option value="">(Inbox / No Folder)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="h-3 w-px bg-neutral-300" />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <TagIcon className="h-3.5 w-3.5 text-neutral-500" />
          {(note.tags || []).map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 bg-white border border-neutral-300 px-1.5 py-0.5 rounded text-xs text-neutral-800"
            >
              <span>{t.name}</span>
              <button
                onClick={() => handleRemoveTag(t.id)}
                className="hover:text-black text-neutral-400"
              >
                &times;
              </button>
            </span>
          ))}

          {/* Quick Add Tag */}
          <form onSubmit={handleCreateAndAddTag} className="inline-flex items-center">
            <input
              type="text"
              placeholder="+ tag"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              className="w-16 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </form>
        </div>
      </div>

      {/* AI Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-neutral-100 p-2 rounded-lg border border-neutral-200 text-xs text-neutral-900">
        <span className="font-semibold flex items-center gap-1.5 text-neutral-900">
          <Sparkles className="h-3.5 w-3.5 text-neutral-800" />
          AI Actions:
        </span>
        <button
          onClick={handleAiSuggestTitle}
          disabled={isAiLoading}
          className="rounded bg-white border border-neutral-300 px-2.5 py-1 text-neutral-800 font-medium hover:bg-neutral-50 hover:border-neutral-400 transition shadow-xs disabled:opacity-50"
        >
          Suggest Title
        </button>
        <button
          onClick={handleAiSummarize}
          disabled={isAiLoading}
          className="rounded bg-white border border-neutral-300 px-2.5 py-1 text-neutral-800 font-medium hover:bg-neutral-50 hover:border-neutral-400 transition shadow-xs disabled:opacity-50"
        >
          Summarize
        </button>
        <button
          onClick={handleAiExtractActions}
          disabled={isAiLoading}
          className="rounded bg-white border border-neutral-300 px-2.5 py-1 text-neutral-800 font-medium hover:bg-neutral-50 hover:border-neutral-400 transition shadow-xs disabled:opacity-50"
        >
          Extract Tasks
        </button>
        {isAiLoading && (
          <span className="text-xs text-neutral-600 flex items-center gap-1 animate-pulse ml-auto font-medium">
            Processing with AI...
          </span>
        )}
      </div>

      {/* AI Review Card: Title Suggestion */}
      {titleSuggestion && (
        <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-3 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
              <Sparkles className="h-4 w-4 text-neutral-700" />
              <span>Proposed Title Suggestion</span>
            </div>
            {titleSuggestion.sourceVersion !== note.version && (
              <span className="text-xs text-neutral-500 italic">
                (Generated from v{titleSuggestion.sourceVersion}; note is now v{note.version})
              </span>
            )}
          </div>
          <p className="text-neutral-900 font-medium bg-white p-2 rounded border border-neutral-200">
            &ldquo;{titleSuggestion.title}&rdquo;
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={applyTitleSuggestion}
              className="flex items-center gap-1 bg-black text-white px-3 py-1 rounded text-xs font-medium hover:bg-neutral-800 transition"
            >
              <Check className="h-3 w-3" />
              <span>Apply Title</span>
            </button>
            <button
              onClick={() => setTitleSuggestion(null)}
              className="flex items-center gap-1 text-neutral-700 bg-white border border-neutral-300 px-3 py-1 rounded text-xs hover:bg-neutral-100 transition"
            >
              <X className="h-3 w-3" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Review Card: Summary */}
      {summarySuggestion && (
        <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-neutral-700" />
              AI Summary
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(summarySuggestion.summary);
                alert('Summary copied to clipboard!');
              }}
              className="text-xs text-neutral-900 flex items-center gap-1 hover:underline font-medium"
            >
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </button>
          </div>
          <p className="text-neutral-800 leading-relaxed">{summarySuggestion.summary}</p>
          {summarySuggestion.keyPoints.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Key Points
              </span>
              <ul className="list-disc pl-5 text-xs text-neutral-700 space-y-0.5">
                {summarySuggestion.keyPoints.map((kp, i) => (
                  <li key={i}>{kp}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => setSummarySuggestion(null)}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* AI Review Card: Action Extraction */}
      {actionSuggestions && (
        <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-900 flex items-center gap-1.5 text-sm">
              <CheckCircle className="h-4 w-4 text-neutral-700" />
              Review Extracted Action Items ({actionSuggestions.length})
            </span>
            {actionSourceVersion && actionSourceVersion !== note.version && (
              <span className="text-xs text-neutral-500 italic">
                (Extracted from v{actionSourceVersion}; note is now v{note.version})
              </span>
            )}
          </div>

          <div className="space-y-2">
            {actionSuggestions.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 bg-white p-2.5 rounded border border-neutral-200 text-xs"
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) => {
                    const next = [...actionSuggestions];
                    next[idx].selected = e.target.checked;
                    setActionSuggestions(next);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
                />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-neutral-900">{item.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-neutral-500">
                    {item.assigneeName && (
                      <span className="bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded text-[11px] font-medium text-neutral-800">
                        Assignee: {item.assigneeName}
                      </span>
                    )}
                    {item.dueDateText && (
                      <span className="bg-neutral-100 border border-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        Due: {item.dueDateText}
                      </span>
                    )}
                    <span className="italic text-neutral-500">
                      Excerpt: &ldquo;{item.sourceExcerpt}&rdquo;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreateApprovedTasks}
              className="bg-black text-white px-3.5 py-1.5 rounded text-xs font-semibold hover:bg-neutral-800 shadow-sm transition"
            >
              Create Approved Tasks ({actionSuggestions.filter((i) => i.selected).length})
            </button>
            <button
              onClick={() => setActionSuggestions(null)}
              className="text-xs text-neutral-600 hover:text-black px-2 py-1 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tasksCreatedNotice && (
        <div className="bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs px-3 py-2 rounded flex items-center justify-between">
          <span>{tasksCreatedNotice}</span>
          <button onClick={() => setTasksCreatedNotice(null)} className="font-bold text-neutral-700 hover:text-black">
            &times;
          </button>
        </div>
      )}

      {/* Editor Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border border-neutral-200 bg-white p-1 rounded-lg shadow-xs sticky top-16 z-20">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('bold') ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('italic') ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-neutral-200" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('heading', { level: 1 }) ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('heading', { level: 2 }) ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('heading', { level: 3 }) ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-neutral-200" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('bulletList') ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('orderedList') ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('blockquote') ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded hover:bg-neutral-100 transition ${editor.isActive('codeBlock') ? 'bg-neutral-200 text-neutral-900 font-bold' : 'text-neutral-600'}`}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-600 transition"
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Main Content Area */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 min-h-[450px] shadow-xs">
        <EditorContent editor={editor} />
      </div>

      {/* Sharing Settings Modal */}
      {isShareModalOpen && (
        <SharingModal
          noteId={note.id}
          noteTitle={title}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}

