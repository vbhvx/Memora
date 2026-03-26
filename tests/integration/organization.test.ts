import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { OrganizationService } from '@/server/services/organization-service';
import { NoteService } from '@/server/services/note-service';
import { ApiError } from '@/server/errors/api-error';
import crypto from 'crypto';

describe('Integration: Folders, Tags & Note Organization', () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    userA = `usr_${crypto.randomUUID()}`;
    userB = `usr_${crypto.randomUUID()}`;

    await db.insert(users).values([
      { id: userA, email: `org_a_${Date.now()}@example.com`, name: 'User A', passwordHash: 'hash' },
      { id: userB, email: `org_b_${Date.now()}@example.com`, name: 'User B', passwordHash: 'hash' },
    ]);
  });

  it('creates parent and child folders', async () => {
    const parent = await OrganizationService.createFolder(userA, 'Work');
    expect(parent.id).toBeDefined();
    expect(parent.name).toBe('Work');

    const child = await OrganizationService.createFolder(userA, 'Projects', parent.id);
    expect(child.parentId).toBe(parent.id);

    const folders = await OrganizationService.listFolders(userA);
    expect(folders.length).toBe(2);
  });

  it('prevents folder from becoming its own parent', async () => {
    const folder = await OrganizationService.createFolder(userA, 'Standalone');
    await expect(
      OrganizationService.updateFolder(userA, folder.id, undefined, folder.id)
    ).rejects.toThrow(ApiError);
  });

  it('creates tags and returns existing tag on duplicate name', async () => {
    const tag1 = await OrganizationService.createTag(userA, 'Engineering');
    const tag2 = await OrganizationService.createTag(userA, 'Engineering');
    expect(tag1.id).toBe(tag2.id);
  });

  it('assigns tags to notes and retrieves them', async () => {
    const tag = await OrganizationService.createTag(userA, 'Backend');
    const note = await NoteService.createNote(userA, {
      title: 'PostgreSQL Architecture',
      tagIds: [tag.id],
    });

    expect(note.tags.length).toBe(1);
    expect(note.tags[0].name).toBe('Backend');

    // Update tags with setNoteTags
    const newTag = await OrganizationService.createTag(userA, 'Database');
    await OrganizationService.setNoteTags(userA, note.id, [tag.id, newTag.id]);

    const refetched = await NoteService.getNoteById(userA, note.id);
    expect(refetched.tags.length).toBe(2);
  });

  it('prevents User A from attaching User B tags or folders', async () => {
    const folderB = await OrganizationService.createFolder(userB, 'Secret B');
    const tagB = await OrganizationService.createTag(userB, 'Confidential B');

    // User A cannot create note in User B's folder
    await expect(
      NoteService.createNote(userA, {
        title: 'Sneaky note',
        folderId: folderB.id,
      })
    ).rejects.toThrow(ApiError);

    // User A assigning User B's tag ignores it or rejects
    const noteA = await NoteService.createNote(userA, { title: 'Note A' });
    await OrganizationService.setNoteTags(userA, noteA.id, [tagB.id]);
    const refetched = await NoteService.getNoteById(userA, noteA.id);
    expect(refetched.tags.length).toBe(0);
  });
});

