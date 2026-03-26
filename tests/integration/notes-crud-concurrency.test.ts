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

  it('rolls back to a previous revision snapshot and creates a new rollback revision', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Original Roadmap V1',
      content: '<p>Roadmap V1 details</p>',
      plainText: 'Roadmap V1 details',
    });

    // Update note to V2
    await NoteService.updateNote(userId, note.id, {
      title: 'Accidentally Altered Title V2',
      content: '<p>Altered V2</p>',
      plainText: 'Altered V2',
      version: 1,
    });

    const revisions = await NoteService.getRevisions(userId, note.id);
    const rev1 = revisions.find((r) => r.version === 1);
    expect(rev1).toBeDefined();

    // Rollback to revision 1
    const rolledBack = await NoteService.rollbackRevision(userId, note.id, rev1!.id);
    expect(rolledBack.version).toBe(3);
    expect(rolledBack.title).toBe('Original Roadmap V1');
    expect(rolledBack.plainText).toBe('Roadmap V1 details');

    // Confirm new revision history has 3 revisions
    const allRevs = await NoteService.getRevisions(userId, note.id);
    expect(allRevs.length).toBe(3);
  });

  it('restores soft-deleted note from trash and permanently purges with hard=true', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Temporary Note For Trash Test',
    });

    // Soft delete
    await NoteService.deleteNote(userId, note.id, false);

    // Verify it appears in trash
    const trashList = await NoteService.listNotes(userId, { isTrash: true });
    expect(trashList.some((n) => n.id === note.id)).toBe(true);

    // Restore note
    const restored = await NoteService.restoreNote(userId, note.id);
    expect(restored.deletedAt).toBeNull();

    // Verify it is no longer in trash but active in regular list
    const activeList = await NoteService.listNotes(userId);
    expect(activeList.some((n) => n.id === note.id)).toBe(true);

    // Hard purge
    await NoteService.deleteNote(userId, note.id, true);
    const trashAfterPurge = await NoteService.listNotes(userId, { isTrash: true });
    expect(trashAfterPurge.some((n) => n.id === note.id)).toBe(false);
  });

  it('duplicates note content, resets version to 1, and appends copy suffix', async () => {
    const original = await NoteService.createNote(userId, {
      title: 'Sprint Retrospective Template',
      content: '<p>What went well? What needs improvement?</p>',
      plainText: 'What went well? What needs improvement?',
    });

    const duplicate = await NoteService.duplicateNote(userId, original.id);
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.title).toBe('Sprint Retrospective Template (Copy)');
    expect(duplicate.plainText).toBe('What went well? What needs improvement?');
    expect(duplicate.version).toBe(1);
  });

  it('performs batch operations on multiple notes (archive, unarchive, trash)', async () => {
    const n1 = await NoteService.createNote(userId, { title: 'Batch Note 1' });
    const n2 = await NoteService.createNote(userId, { title: 'Batch Note 2' });
    const n3 = await NoteService.createNote(userId, { title: 'Batch Note 3' });

    // Batch Archive
    const batchArchiveRes = await NoteService.batchUpdateNotes(userId, {
      noteIds: [n1.id, n2.id],
      action: 'archive',
    });
    expect(batchArchiveRes.count).toBe(2);

    const archivedNotes = await NoteService.listNotes(userId, { isArchived: true });
    expect(archivedNotes.some((n) => n.id === n1.id)).toBe(true);
    expect(archivedNotes.some((n) => n.id === n2.id)).toBe(true);

    // Batch Unarchive
    const batchUnarchiveRes = await NoteService.batchUpdateNotes(userId, {
      noteIds: [n1.id],
      action: 'unarchive',
    });
    expect(batchUnarchiveRes.count).toBe(1);

    // Batch Trash
    const batchTrashRes = await NoteService.batchUpdateNotes(userId, {
      noteIds: [n1.id, n2.id, n3.id],
      action: 'trash',
    });
    expect(batchTrashRes.count).toBe(3);

    const trashNotes = await NoteService.listNotes(userId, { isTrash: true });
    expect(trashNotes.some((n) => n.id === n3.id)).toBe(true);
  });
});

