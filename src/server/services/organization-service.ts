import { db } from '@/db/client';
import { folders, tags, noteTags, notes } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { ApiError } from '../errors/api-error';
import crypto from 'crypto';

export class OrganizationService {
  // ----------------------------------------
  // Folders
  // ----------------------------------------
  static async listFolders(userId: string) {
    return db.query.folders.findMany({
      where: eq(folders.ownerId, userId),
      orderBy: (folders, { asc }) => [asc(folders.name)],
    });
  }

  static async createFolder(userId: string, name: string, parentId?: string | null) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw ApiError.badRequest('Folder name cannot be empty.');
    }

    if (parentId) {
      const parent = await db.query.folders.findFirst({
        where: and(eq(folders.id, parentId), eq(folders.ownerId, userId)),
      });
      if (!parent) {
        throw ApiError.badRequest('Parent folder not found or does not belong to you.');
      }
    }

    const [created] = await db
      .insert(folders)
      .values({
        id: `folder_${crypto.randomUUID()}`,
        ownerId: userId,
        name: trimmed,
        parentId: parentId || null,
      })
      .returning();

    return created;
  }

  static async updateFolder(userId: string, folderId: string, name?: string, parentId?: string | null) {
    const existing = await db.query.folders.findFirst({
      where: and(eq(folders.id, folderId), eq(folders.ownerId, userId)),
    });
    if (!existing) {
      throw ApiError.notFound('Folder not found.');
    }

    if (parentId && parentId === folderId) {
      throw ApiError.badRequest('A folder cannot be its own parent.');
    }

    if (parentId) {
      const parent = await db.query.folders.findFirst({
        where: and(eq(folders.id, parentId), eq(folders.ownerId, userId)),
      });
      if (!parent) {
        throw ApiError.badRequest('Parent folder does not exist or belong to you.');
      }
    }

    const [updated] = await db
      .update(folders)
      .set({
        name: name !== undefined ? name.trim() : existing.name,
        parentId: parentId !== undefined ? parentId : existing.parentId,
        updatedAt: new Date(),
      })
      .where(and(eq(folders.id, folderId), eq(folders.ownerId, userId)))
      .returning();

    return updated;
  }

  static async deleteFolder(userId: string, folderId: string) {
    const existing = await db.query.folders.findFirst({
      where: and(eq(folders.id, folderId), eq(folders.ownerId, userId)),
    });
    if (!existing) {
      throw ApiError.notFound('Folder not found.');
    }

    // Unlink notes in this folder (move to inbox/null)
    await db
      .update(notes)
      .set({ folderId: null })
      .where(and(eq(notes.ownerId, userId), eq(notes.folderId, folderId)));

    await db.delete(folders).where(and(eq(folders.id, folderId), eq(folders.ownerId, userId)));

    return { success: true, id: folderId };
  }

  // ----------------------------------------
  // Tags
  // ----------------------------------------
  static async listTags(userId: string) {
    return db.query.tags.findMany({
      where: eq(tags.ownerId, userId),
      orderBy: (tags, { asc }) => [asc(tags.name)],
    });
  }

  static async createTag(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw ApiError.badRequest('Tag name cannot be empty.');
    }

    // Check case-insensitive duplicate
    const existing = await db.query.tags.findFirst({
      where: and(eq(tags.ownerId, userId), eq(tags.name, trimmed)),
    });
    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(tags)
      .values({
        id: `tag_${crypto.randomUUID()}`,
        ownerId: userId,
        name: trimmed,
      })
      .returning();

    return created;
  }

  static async setNoteTags(userId: string, noteId: string, tagIds: string[]) {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
    });
    if (!note) {
      throw ApiError.notFound('Note not found.');
    }

    // Verify all tags belong to user
    let validTags: string[] = [];
    if (tagIds.length > 0) {
      const userTags = await db.query.tags.findMany({
        where: and(eq(tags.ownerId, userId), inArray(tags.id, tagIds)),
      });
      validTags = userTags.map((t) => t.id);
    }

    // Replace associations
    await db.delete(noteTags).where(eq(noteTags.noteId, noteId));

    if (validTags.length > 0) {
      await db.insert(noteTags).values(
        validTags.map((tid) => ({
          noteId,
          tagId: tid,
        }))
      );
    }

    return validTags;
  }
}

