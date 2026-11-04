'use client';

import React, { useState } from 'react';
import { Download, X, FileText, Code, Check } from 'lucide-react';

interface NoteExportModalProps {
  title: string;
  content: string;
  plainText: string;
  version: number;
  updatedAt: string;
  onClose: () => void;
}

export function NoteExportModal({
  title,
  content,
  plainText,
  version,
  updatedAt,
  onClose,
}: NoteExportModalProps) {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  const cleanFilename = (title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const triggerDownload = (filename: string, contentStr: string, mimeType: string) => {
    const blob = new Blob([contentStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    // Convert basic HTML to clean Markdown
    let md = `# ${title || 'Untitled'}\n\n`;
    let body = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    md += body;
    triggerDownload(`${cleanFilename}.md`, md, 'text/markdown;charset=utf-8');
    setDownloadedFormat('md');
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  const handleExportPlainText = () => {
    const txt = `${title || 'Untitled'}\n${'='.repeat((title || 'Untitled').length)}\n\n${plainText}\n\nVersion: ${version}\nLast Updated: ${new Date(updatedAt).toLocaleString()}`;
    triggerDownload(`${cleanFilename}.txt`, txt, 'text/plain;charset=utf-8');
    setDownloadedFormat('txt');
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  const handleExportHtml = () => {
    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Untitled'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 750px; margin: 40px auto; padding: 0 20px; color: #111; }
    h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 8px; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #555; }
    code { background: #f4f4f5; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
    pre { background: #18181b; color: #fff; padding: 12px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; color: inherit; padding: 0; }
  </style>
</head>
<body>
  <h1>${title || 'Untitled'}</h1>
  <div>${content || `<p>${plainText}</p>`}</div>
  <hr style="margin-top: 40px; border: none; border-top: 1px solid #eaeaea;">
  <footer style="font-size: 12px; color: #888;">Exported from Memora · Version ${version} · ${new Date(updatedAt).toLocaleDateString()}</footer>
</body>
</html>`;
    triggerDownload(`${cleanFilename}.html`, htmlDoc, 'text/html;charset=utf-8');
    setDownloadedFormat('html');
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  const handleExportJson = () => {
    const data = {
      title,
      content,
      plainText,
      version,
      updatedAt,
      exportedAt: new Date().toISOString(),
      platform: 'Memora',
    };
    triggerDownload(`${cleanFilename}.json`, JSON.stringify(data, null, 2), 'application/json');
    setDownloadedFormat('json');
    setTimeout(() => setDownloadedFormat(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-zinc-900" />
            <h3 className="font-semibold text-zinc-900">Export Note</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-xs text-zinc-500 mb-2">
            Select a format to download &ldquo;{title || 'Untitled'}&rdquo; to your local machine:
          </p>

          <button
            onClick={handleExportMarkdown}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50/80 transition text-left text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-zinc-100 text-zinc-800 font-mono font-bold text-[10px]">
                .MD
              </div>
              <div>
                <span className="font-bold text-zinc-900 block">Markdown</span>
                <span className="text-zinc-500 text-[11px]">Clean formatted markdown document</span>
              </div>
            </div>
            {downloadedFormat === 'md' && <Check className="h-4 w-4 text-zinc-900" />}
          </button>

          <button
            onClick={handleExportPlainText}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50/80 transition text-left text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-zinc-100 text-zinc-800 font-mono font-bold text-[10px]">
                .TXT
              </div>
              <div>
                <span className="font-bold text-zinc-900 block">Plain Text</span>
                <span className="text-zinc-500 text-[11px]">Unformatted textual content</span>
              </div>
            </div>
            {downloadedFormat === 'txt' && <Check className="h-4 w-4 text-zinc-900" />}
          </button>

          <button
            onClick={handleExportHtml}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50/80 transition text-left text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-zinc-100 text-zinc-800 font-mono font-bold text-[10px]">
                .HTML
              </div>
              <div>
                <span className="font-bold text-zinc-900 block">HTML Webpage</span>
                <span className="text-zinc-500 text-[11px]">Standalone styled HTML document</span>
              </div>
            </div>
            {downloadedFormat === 'html' && <Check className="h-4 w-4 text-zinc-900" />}
          </button>

          <button
            onClick={handleExportJson}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50/80 transition text-left text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-zinc-100 text-zinc-800 font-mono font-bold text-[10px]">
                .JSON
              </div>
              <div>
                <span className="font-bold text-zinc-900 block">JSON Raw Data</span>
                <span className="text-zinc-500 text-[11px]">Structured data with version metadata</span>
              </div>
            </div>
            {downloadedFormat === 'json' && <Check className="h-4 w-4 text-zinc-900" />}
          </button>
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
