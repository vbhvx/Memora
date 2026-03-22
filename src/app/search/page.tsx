'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { apiFetch } from '@/lib/api-client';
import {
  Search as SearchIcon,
  Filter,
  FileText,
  Pin,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  plainText: string;
  folderId: string | null;
  folderName: string | null;
  isPinned: boolean;
  updatedAt: string;
  rank: number;
}

export default function SearchPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'rank' | 'updated' | 'created' | 'title'>('rank');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const performSearch = async (searchTerm: string) => {
    setSearching(true);
    try {
      const qParams = new URLSearchParams();
      if (searchTerm.trim()) qParams.set('q', searchTerm.trim());
      if (sort) qParams.set('sort', sort);
      if (pinnedOnly) qParams.set('pinned', 'true');
      if (archivedOnly) qParams.set('archived', 'true');

      const data = await apiFetch<{
        results: SearchResult[];
        pagination: { total: number };
      }>(`/api/v1/search?${qParams.toString()}`);

      setResults(data.results);
      setTotalCount(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort, pinnedOnly, archivedOnly, user]);

  if (isLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Intelligent Search</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search titles and contents with PostgreSQL full-text search, relevance ranking, and excerpts.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes by keyword, topic, or phrase..."
            className="w-full rounded-xl border border-neutral-300 bg-white py-3 pl-12 pr-4 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          {searching && (
            <span className="absolute right-4 top-3 text-xs text-neutral-400 animate-pulse">
              Searching...
            </span>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 bg-white p-3 rounded-xl border border-neutral-200">
          <div className="flex items-center gap-3">
            <span className="font-semibold flex items-center gap-1 text-neutral-500">
              <Filter className="h-3.5 w-3.5" /> Filters:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={pinnedOnly}
                onChange={(e) => setPinnedOnly(e.target.checked)}
                className="rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <span>Pinned only</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={archivedOnly}
                onChange={(e) => setArchivedOnly(e.target.checked)}
                className="rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <span>Archived only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-transparent border-none text-xs font-medium text-neutral-700 focus:outline-none cursor-pointer"
            >
              <option value="rank">Relevance Rank</option>
              <option value="updated">Recently Updated</option>
              <option value="created">Recently Created</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Results Header */}
        {totalCount !== null && (
          <div className="text-xs text-neutral-500">
            Found {totalCount} {totalCount === 1 ? 'matching note' : 'matching notes'}
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {results.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-black hover:shadow-sm transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-900 group-hover:text-black text-base">
                      {note.title}
                    </h3>
                    {note.isPinned && <Pin className="h-3.5 w-3.5 text-neutral-700" />}
                    {note.folderName && (
                      <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-200">
                        {note.folderName}
                      </span>
                    )}
                  </div>

                  {/* Highlighted Excerpt */}
                  <div
                    className="text-xs text-neutral-600 leading-relaxed [&>mark]:bg-neutral-200 [&>mark]:text-black [&>mark]:font-semibold [&>mark]:px-1 [&>mark]:rounded"
                    dangerouslySetInnerHTML={{ __html: note.excerpt || note.plainText }}
                  />
                </div>

                <div className="text-right text-[11px] text-neutral-400 flex-shrink-0">
                  <div>{new Date(note.updatedAt).toLocaleDateString()}</div>
                  {note.rank > 0 && (
                    <div className="text-[10px] text-neutral-500 font-mono mt-1">
                      score: {note.rank.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {results.length === 0 && !searching && (
            <div className="py-16 text-center space-y-2">
              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">No matching notes found</p>
              <p className="text-xs text-slate-400">
                Try searching for different keywords or clear active filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

