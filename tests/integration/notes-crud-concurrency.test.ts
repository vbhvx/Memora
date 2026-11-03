import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { NoteService } from '@/server/services/note-service';
import { ApiError } from '@/server/errors/api-error';
import crypto from 'crypto';

describe('Integration: Note CRUD, Versioning & Optimistic Concurrency', () => {
  let userId: string;

  beforeAll(async () => {
    userId = `usr_${crypto.randomUUID()}`;
    await db.insert(users).values({
      id: userId,
      email: `notes_test_${Date.now()}@example.com`,
      name: 'Notes Tester',
      passwordHash: 'hash',
    });
  });

  it('creates a note with initial version 1 and snapshot', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Sprint Planning',
      content: '<p>Discuss roadmap</p>',
      plainText: 'Discuss roadmap',
    });

    expect(note.id).toBeDefined();
    expect(note.title).toBe('Sprint Planning');
    expect(note.version).toBe(1);

    const revisions = await NoteService.getRevisions(userId, note.id);
    expect(revisions.length).toBe(1);
    expect(revisions[0].version).toBe(1);
    expect(revisions[0].titleSnapshot).toBe('Sprint Planning');
  });

  it('updates a note, bumps version to 2 and creates a new revision', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Original Title',
      content: 'Original Content',
      plainText: 'Original Content',
    });

    const updated = await NoteService.updateNote(userId, note.id, {
      title: 'Updated Title',
      content: 'Updated Content',
      plainText: 'Updated Content',
      version: 1, // matches current version
    });

    expect(updated.version).toBe(2);
    expect(updated.title).toBe('Updated Title');

    const revisions = await NoteService.getRevisions(userId, note.id);
    expect(revisions.length).toBe(2);
    expect(revisions[0].version).toBe(2);
  });

  it('rejects stale concurrent updates with a 409 CONFLICT error', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Concurrent Note',
      content: 'Content V1',
      version: 1,
    });

    // Editor A updates note to version 2
    await NoteService.updateNote(userId, note.id, {
      title: 'Editor A change',
      version: 1,
    });

    // Editor B attempts to update using stale version 1
    await expect(
      NoteService.updateNote(userId, note.id, {
        title: 'Editor B stale change',
        version: 1, // now stale because note is version 2!
      })
    ).rejects.toThrow(ApiError);

    // Verify error code is CONFLICT
    try {
      await NoteService.updateNote(userId, note.id, {
        title: 'Editor B stale change',
        version: 1,
      });
    } catch (err: any) {
      expect(err.code).toBe('CONFLICT');
      expect(err.statusCode).toBe(409);
    }
  });

  it('soft-deletes a note and excludes it from listings', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'To be deleted',
    });

    await NoteService.deleteNote(userId, note.id);

    // Trying to fetch deleted note throws 404
    await expect(NoteService.getNoteById(userId, note.id)).rejects.toThrow(ApiError);

    const list = await NoteService.listNotes(userId);
    expect(list.some((n) => n.id === note.id)).toBe(false);
  });
});

