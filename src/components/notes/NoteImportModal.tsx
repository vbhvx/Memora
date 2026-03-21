'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import {
  Upload,
  X,
  FileText,
  Check,
  Folder,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface NoteImportModalProps {
  onClose: () => void;
  onImportSuccess?: (note: { id: string; title: string }) => void;
}

export function NoteImportModal({ onClose, onImportSuccess }: NoteImportModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedTitle, setParsedTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ folders: Array<{ id: string; name: string }> }>('/api/v1/folders')
      .then((res) => setFolders(res.folders || []))
      .catch(() => {});
  }, []);

  const parseMarkdownContent = (filename: string, text: string) => {
    let title = '';
    let body = text;

    // 1. Check for YAML Frontmatter (e.g., --- \n title: My Title \n ---)
    const frontmatterMatch = text.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      body = text.slice(frontmatterMatch[0].length);

      const titleMatch = frontmatter.match(/^title:\s*["']?(.*?)["']?$/m);
      if (titleMatch && titleMatch[1]?.trim()) {
        title = titleMatch[1].trim();
      }
    }

    // 2. Check for leading markdown heading # Title if not found in frontmatter
    if (!title) {
      const headingMatch = body.match(/^#\s+(.+)$/m);
      if (headingMatch && headingMatch[1]?.trim()) {
        title = headingMatch[1].trim();
        // Remove leading heading from body to avoid duplicate title
        body = body.replace(/^#\s+.+[\r\n]*/, '');
      }
    }

    // 3. Fallback to clean filename without extension
    if (!title) {
      title = filename
        .replace(/\.(md|markdown|txt)$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return {
      title: title || 'Imported Note',
      body: body.trim(),
    };
  };

  const handleFile = (file: File) => {
    setError(null);
    if (!file.name.match(/\.(md|markdown|txt)$/i)) {
      setError('Please select a valid Markdown (.md) or Text (.txt) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setSelectedFileName(file.name);
      setRawText(content);

      const { title } = parseMarkdownContent(file.name, content);
      setParsedTitle(title);
    };
    reader.onerror = () => {
      setError('Failed to read file contents.');
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!rawText.trim()) {
      setError('No document content to import.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      // Basic markdown to clean HTML conversion for Tiptap
      const lines = rawText.split('\n');
      const htmlParagraphs = lines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
          if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
          if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return `<li>${trimmed.slice(2)}</li>`;
          return `<p>${trimmed}</p>`;
        })
        .filter(Boolean)
        .join('');

      const res = await apiFetch<{ note: { id: string; title: string } }>('/api/v1/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: parsedTitle.trim() || 'Imported Note',
          content: htmlParagraphs || `<p>${rawText}</p>`,
          plainText: rawText,
          folderId: selectedFolderId || null,
        }),
      });

      if (onImportSuccess) {
        onImportSuccess(res.note);
      } else {
        router.push(`/notes/${res.note.id}`);
      }
      onClose();
    } catch (err: any) {
      setError(`Failed to import note: ${err.message}`);
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-black" />
            <h3 className="font-bold text-neutral-900 tracking-tight">Import Markdown or Text Note</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragActive
                ? 'border-black bg-neutral-50'
                : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <div className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 text-neutral-800 mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {selectedFileName ? selectedFileName : 'Choose a file or drag and drop here'}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Supports .md, .markdown, or .txt documents
                </p>
              </div>
            </div>
          </div>

          {/* Parsed Note Metadata Form */}
          {rawText && (
            <div className="space-y-3 pt-2 border-t border-neutral-100 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Note Title
                </label>
                <input
                  type="text"
                  value={parsedTitle}
                  onChange={(e) => setParsedTitle(e.target.value)}
                  placeholder="Note title"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-neutral-600 block">
                    Target Folder
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none"
                  >
                    <option value="">(Inbox / No Folder)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold uppercase tracking-wider text-neutral-600 block">
                    Document Stats
                  </label>
                  <div className="px-2.5 py-1.5 bg-neutral-100 rounded-lg text-neutral-600 text-xs">
                    {rawText.trim().split(/\s+/).filter(Boolean).length} words · {rawText.length} chars
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-neutral-600 hover:text-black transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!rawText.trim() || isImporting}
            className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition"
          >
            {isImporting ? (
              <span>Importing...</span>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Import Note</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
