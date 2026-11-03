import { db, pool } from '@/db/client';
import { notes, noteRevisions, noteTags, tags, folders } from '@/db/schema';
import { eq, and, isNull, desc, asc, inArray } from 'drizzle-orm';
import { ApiError } from '../errors/api-error';
import crypto from 'crypto';

export interface CreateNoteInput {
  title?: string;
  content?: string;
  plainText?: string;
  folderId?: string | null;
  contentFormat?: string;
  isPinned?: boolean;
  tagIds?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  plainText?: string;
  folderId?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  version?: number;
}

export interface ListNotesOptions {
  folderId?: string | null;
  tagId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  sort?: 'updated' | 'created' | 'title';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class NoteService {
  static async createNote(userId: string, input: CreateNoteInput) {
    const noteId = `note_${crypto.randomUUID()}`;
    const title = input.title?.trim() || 'Untitled';
    const content = input.content || '';
    const plainText = input.plainText || '';
    const contentFormat = input.contentFormat || 'tiptap_json';
    const isPinned = input.isPinned ?? false;

    // Validate folder ownership if provided
    if (input.folderId) {
      const folder = await db.query.folders.findFirst({
        where: and(eq(folders.id, input.folderId), eq(folders.ownerId, userId)),
      });
      if (!folder) {
        throw ApiError.badRequest('Specified folder does not exist or belong to you.');
      }
    }

    const [createdNote] = await db
      .insert(notes)
      .values({
        id: noteId,
        ownerId: userId,
        folderId: input.folderId || null,
        title,
        content,
        plainText,
        contentFormat,
        version: 1,
        isPinned,
      })
      .returning();

    // Create initial revision
    const revId = `rev_${crypto.randomUUID()}`;
    await db.insert(noteRevisions).values({
      id: revId,
      noteId: createdNote.id,
      version: 1,
      titleSnapshot: title,
      contentSnapshot: content,
      plainTextSnapshot: plainText,
      createdBy: userId,
    });

    // Attach tags if provided
    if (input.tagIds && input.tagIds.length > 0) {
      // Validate that all tags belong to user
      const userTags = await db.query.tags.findMany({
        where: and(eq(tags.ownerId, userId), inArray(tags.id, input.tagIds)),
      });
      const validTagIds = userTags.map((t) => t.id);
      if (validTagIds.length > 0) {
        await db.insert(noteTags).values(
          validTagIds.map((tid) => ({
            noteId: createdNote.id,
            tagId: tid,
          }))
        );
      }
    }

    return this.getNoteById(userId, createdNote.id);
  }

  static async getNoteById(userId: string, noteId: string) {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
      with: {
        folder: true,
        noteTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!note) {
      throw ApiError.notFound('Note not found.');
    }

    return {
      ...note,
      tags: note.noteTags.map((nt) => nt.tag),
    };
  }

  static async updateNote(userId: string, noteId: string, input: UpdateNoteInput) {
    const existing = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
    });

    if (!existing) {
      throw ApiError.notFound('Note not found.');
    }

    // Optimistic Concurrency Control
    if (input.version !== undefined && input.version !== existing.version) {
      throw ApiError.conflict(
        `Conflict detected: Stale update rejected. Current server version is ${existing.version}, received ${input.version}.`,
        [
          {
            field: 'version',
            code: 'VERSION_MISMATCH',
            message: `Current note version is ${existing.version}`,
          },
        ]
      );
    }

    // Validate folder ownership if changed
    if (input.folderId !== undefined && input.folderId !== null && input.folderId !== existing.folderId) {
      const folder = await db.query.folders.findFirst({
        where: and(eq(folders.id, input.folderId), eq(folders.ownerId, userId)),
      });
      if (!folder) {
        throw ApiError.badRequest('Specified folder does not exist or belong to you.');
      }
    }

    const nextVersion = existing.version + 1;
    const title = input.title !== undefined ? input.title.trim() || 'Untitled' : existing.title;
    const content = input.content !== undefined ? input.content : existing.content;
    const plainText = input.plainText !== undefined ? input.plainText : existing.plainText;
    const isPinned = input.isPinned !== undefined ? input.isPinned : existing.isPinned;
    const folderId = input.folderId !== undefined ? input.folderId : existing.folderId;
    const archivedAt =
      input.isArchived !== undefined
        ? input.isArchived
          ? new Date()
          : null
        : existing.archivedAt;

    const [updated] = await db
      .update(notes)
      .set({
        title,
        content,
        plainText,
        folderId,
        isPinned,
        archivedAt,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)))
      .returning();

    // Create a new revision snapshot if title or content changed
    if (title !== existing.title || content !== existing.content) {
      await db.insert(noteRevisions).values({
        id: `rev_${crypto.randomUUID()}`,
        noteId: noteId,
        version: nextVersion,
        titleSnapshot: title,
        contentSnapshot: content,
        plainTextSnapshot: plainText,
        createdBy: userId,
      });
    }

    return this.getNoteById(userId, updated.id);
  }

  static async deleteNote(userId: string, noteId: string, hard = false) {
    const existing = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId)),
    });

    if (!existing) {
      throw ApiError.notFound('Note not found.');
    }

    if (hard) {
      await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)));
    } else {
      await db
        .update(notes)
        .set({ deletedAt: new Date() })
        .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)));
    }

    return { success: true, id: noteId };
  }

  static async listNotes(userId: string, options: ListNotesOptions = {}) {
    const conditions = [eq(notes.ownerId, userId), isNull(notes.deletedAt)];

    if (options.folderId !== undefined) {
      if (options.folderId === null || options.folderId === 'inbox') {
        conditions.push(isNull(notes.folderId));
      } else {
        conditions.push(eq(notes.folderId, options.folderId));
      }
    }

    if (options.isPinned !== undefined) {
      conditions.push(eq(notes.isPinned, options.isPinned));
    }

    if (options.isArchived !== undefined) {
      if (options.isArchived) {
        conditions.push(isNull(notes.archivedAt)); // inverted check handled cleanly
      }
    }

    const sortCol =
      options.sort === 'created'
        ? notes.createdAt
        : options.sort === 'title'
        ? notes.title
        : notes.updatedAt;

    const orderFn = options.order === 'asc' ? asc : desc;

    const results = await db.query.notes.findMany({
      where: and(...conditions),
      orderBy: [orderFn(sortCol)],
      limit: options.limit || 50,
      offset: options.offset || 0,
      with: {
        folder: true,
        noteTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    let mapped = results.map((n) => ({
      ...n,
      tags: n.noteTags.map((nt) => nt.tag),
    }));

    if (options.tagId) {
      mapped = mapped.filter((n) => n.tags.some((t) => t.id === options.tagId));
    }

    return mapped;
  }

  static async getRevisions(userId: string, noteId: string) {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
    });
    if (!note) {
      throw ApiError.notFound('Note not found.');
    }

    return db.query.noteRevisions.findMany({
      where: eq(noteRevisions.noteId, noteId),
      orderBy: [desc(noteRevisions.version)],
      limit: 30,
    });
  }
}

