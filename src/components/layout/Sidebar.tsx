'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import {
  LayoutDashboard,
  FileText,
  Pin,
  Archive,
  Folder,
  FolderPlus,
  Tag as TagIcon,
  CheckSquare,
  Search,
  Settings,
  ChevronRight,
} from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
}

interface TagItem {
  id: string;
  name: string;
}

export function Sidebar({ onNewNote }: { onNewNote?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadData = async () => {
    try {
      const [foldersData, tagsData] = await Promise.all([
        apiFetch<{ folders: FolderItem[] }>('/api/v1/folders'),
        apiFetch<{ tags: TagItem[] }>('/api/v1/tags'),
      ]);
      setFolders(foldersData.folders);
      setTags(tagsData.tags);
    } catch {
      // Ignored for unauthenticated or initial state
    }
  };

  useEffect(() => {
    loadData();
  }, [pathname]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await apiFetch<{ folder: FolderItem }>('/api/v1/folders', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      setFolders([...folders, res.folder]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'All Notes', href: '/notes', icon: FileText },
    { label: 'Pinned', href: '/notes?pinned=true', icon: Pin },
    { label: 'Archived', href: '/notes?archived=true', icon: Archive },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Tasks & Actions', href: '/tasks', icon: CheckSquare },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        <div>
          <button
            onClick={onNewNote}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition"
          >
            + Quick Capture
          </button>
        </div>

        {/* Main Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href.split('?')[0]);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Folders Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Folders</span>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="rounded p-0.5 hover:bg-slate-200 text-slate-500"
              title="Add Folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {isCreatingFolder && (
            <form onSubmit={handleCreateFolder} className="px-2 py-1 mb-2">
              <input
                type="text"
                autoFocus
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                className="w-full rounded border border-indigo-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </form>
          )}

          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/notes?folderId=${f.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                <Folder className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{f.name}</span>
              </Link>
            ))}
            {folders.length === 0 && !isCreatingFolder && (
              <p className="px-3 text-xs text-slate-400 italic">No folders yet</p>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <div className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 max-h-32 overflow-y-auto">
            {tags.map((t) => (
              <Link
                key={t.id}
                href={`/notes?tagId=${t.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              >
                <TagIcon className="h-2.5 w-2.5 text-slate-400" />
                <span>{t.name}</span>
              </Link>
            ))}
            {tags.length === 0 && (
              <p className="text-xs text-slate-400 italic">No tags created</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}

