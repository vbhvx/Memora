import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { SearchService } from '@/server/services/search-service';
import { NoteService } from '@/server/services/note-service';
import { OrganizationService } from '@/server/services/organization-service';
import crypto from 'crypto';

describe('Integration: PostgreSQL Full-Text Search & Scope Isolation', () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    userA = `usr_${crypto.randomUUID()}`;
    userB = `usr_${crypto.randomUUID()}`;

    await db.insert(users).values([
      { id: userA, email: `search_a_${Date.now()}@example.com`, name: 'User A', passwordHash: 'hash' },
      { id: userB, email: `search_b_${Date.now()}@example.com`, name: 'User B', passwordHash: 'hash' },
    ]);

    // Note 1 for User A: Architecture
    await NoteService.createNote(userA, {
      title: 'Microservices Architecture Review',
      content: 'We reviewed the authentication boundaries and database replication strategy.',
      plainText: 'We reviewed the authentication boundaries and database replication strategy.',
    });

    // Note 2 for User A: Frontend Performance
    await NoteService.createNote(userA, {
      title: 'NextJS Performance Optimizations',
      content: 'Optimize server components and reduce hydration latency.',
      plainText: 'Optimize server components and reduce hydration latency.',
    });

    // Note for User B: Private note with identical keyword
    await NoteService.createNote(userB, {
      title: 'User B Microservices Architecture Secret',
      content: 'Top secret proprietary algorithm for User B only.',
      plainText: 'Top secret proprietary algorithm for User B only.',
    });
  });

  it('searches by keyword and returns ranked results with excerpts', async () => {
    const res = await SearchService.searchNotes(userA, { q: 'Microservices' });
    expect(res.results.length).toBe(1);
    expect(res.results[0].title).toBe('Microservices Architecture Review');
    expect(res.results[0].excerpt).toBeDefined();
    expect(res.results[0].rank).toBeGreaterThan(0);
  });

  it('searches full-text content words', async () => {
    const res = await SearchService.searchNotes(userA, { q: 'replication strategy' });
    expect(res.results.length).toBe(1);
    expect(res.results[0].title).toBe('Microservices Architecture Review');
  });

  it('strictly isolates search results between users', async () => {
    // User A searching for "Microservices" must NEVER see User B's note
    const resA = await SearchService.searchNotes(userA, { q: 'Microservices' });
    expect(resA.results.every((r) => !r.title.includes('Secret'))).toBe(true);

    // User A searching for "proprietary algorithm" (User B's secret) returns 0 results
    const secretSearch = await SearchService.searchNotes(userA, { q: 'proprietary algorithm' });
    expect(secretSearch.results.length).toBe(0);
  });

  it('supports folder and tag filtering', async () => {
    const folder = await OrganizationService.createFolder(userA, 'Engineering Folder');
    const taggedNote = await NoteService.createNote(userA, {
      title: 'Containerization in Folder',
      content: 'Docker and Kubernetes setups',
      plainText: 'Docker and Kubernetes setups',
      folderId: folder.id,
    });

    const searchInFolder = await SearchService.searchNotes(userA, {
      folderId: folder.id,
    });
    expect(searchInFolder.results.length).toBe(1);
    expect(searchInFolder.results[0].id).toBe(taggedNote.id);
  });
});

