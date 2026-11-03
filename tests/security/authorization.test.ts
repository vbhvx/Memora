import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { NoteService } from '@/server/services/note-service';
import { ShareService } from '@/server/services/share-service';
import { SearchService } from '@/server/services/search-service';
import { OrganizationService } from '@/server/services/organization-service';
import { TaskService } from '@/server/services/task-service';
import { ApiError } from '@/server/errors/api-error';
import crypto from 'crypto';

describe('Security: Strict Authorization & Cross-Tenant Isolation', () => {
  let userA: string;
  let userB: string;
  let noteA: any;
  let noteB: any;

  beforeAll(async () => {
    userA = `usr_${crypto.randomUUID()}`;
    userB = `usr_${crypto.randomUUID()}`;

    await db.insert(users).values([
      { id: userA, email: `sec_a_${Date.now()}@example.com`, name: 'Security User A', passwordHash: 'hash' },
      { id: userB, email: `sec_b_${Date.now()}@example.com`, name: 'Security User B', passwordHash: 'hash' },
    ]);

    noteA = await NoteService.createNote(userA, {
      title: 'Confidential Strategy A',
      content: 'Proprietary details of Company A',
      plainText: 'Proprietary details of Company A',
    });

    noteB = await NoteService.createNote(userB, {
      title: 'Confidential Strategy B',
      content: 'Proprietary details of Company B',
      plainText: 'Proprietary details of Company B',
    });
  });

  it('Requirement 1: User A cannot read User B private notes', async () => {
    await expect(NoteService.getNoteById(userA, noteB.id)).rejects.toThrow(ApiError);
  });

  it('Requirement 2: User A cannot modify or delete User B notes', async () => {
    await expect(
      NoteService.updateNote(userA, noteB.id, { title: 'Compromised Title' })
    ).rejects.toThrow(ApiError);

    await expect(NoteService.deleteNote(userA, noteB.id)).rejects.toThrow(ApiError);

    // Verify noteB in DB remains untouched
    const freshB = await NoteService.getNoteById(userB, noteB.id);
    expect(freshB.title).toBe('Confidential Strategy B');
  });

  it('Requirement 3: Search does not reveal inaccessible note titles or excerpts', async () => {
    const searchRes = await SearchService.searchNotes(userA, { q: 'Company B' });
    expect(searchRes.results.length).toBe(0);
  });

  it('Requirement 4: Guest share does not reveal owner other data', async () => {
    const share = await ShareService.createShare(userA, noteA.id, { permission: 'view' });
    const guestData = await ShareService.getSharedNote(share.rawToken);

    expect(guestData.note.id).toBe(noteA.id);
    // Ensure no folder tree, owner details or other notes are present
    expect((guestData as any).folders).toBeUndefined();
    expect((guestData as any).otherNotes).toBeUndefined();
    expect((guestData.note as any).ownerId).toBeUndefined();
  });

  it('Requirement 7: View-only link cannot create comments or edit content', async () => {
    const share = await ShareService.createShare(userA, noteA.id, { permission: 'view' });

    await expect(
      ShareService.addGuestComment(share.rawToken, 'Hacker', 'Attempt comment')
    ).rejects.toThrow(ApiError);

    await expect(
      ShareService.guestEditNote(share.rawToken, { title: 'Hacked', version: noteA.version })
    ).rejects.toThrow(ApiError);
  });

  it('Requirement 9: Folder and tag identifiers cannot bypass ownership checks', async () => {
    const folderB = await OrganizationService.createFolder(userB, 'Protected Folder B');

    await expect(
      NoteService.createNote(userA, {
        title: 'Exploit attempt',
        folderId: folderB.id,
      })
    ).rejects.toThrow(ApiError);

    await expect(
      NoteService.updateNote(userA, noteA.id, {
        folderId: folderB.id,
      })
    ).rejects.toThrow(ApiError);
  });

  it('Requirement 10: Unauthorized users cannot invoke task extraction or claim other notes', async () => {
    await expect(
      TaskService.createTasksFromSuggestions(userA, noteB.id, null, [{ title: 'Stolen task' }])
    ).rejects.toThrow(ApiError);
  });
});

