import { db } from '@/db/client';
import { noteShares, notes, noteComments, noteRevisions } from '@/db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { ApiError } from '../errors/api-error';
import crypto from 'crypto';

export interface CreateShareInput {
  permission: 'view' | 'comment' | 'edit';
  expiresAt?: string | null;
}

export interface UpdateShareInput {
  permission?: 'view' | 'comment' | 'edit';
  expiresAt?: string | null;
}

export class ShareService {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createShare(userId: string, noteId: string, input: CreateShareInput) {
    // Verify note ownership
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
    });
    if (!note) {
      throw ApiError.notFound('Note not found or does not belong to you.');
    }

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const shareId = `share_${crypto.randomUUID()}`;

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('Expiration time must be in the future.');
    }

    const [share] = await db
      .insert(noteShares)
      .values({
        id: shareId,
        noteId,
        tokenHash,
        permission: input.permission,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/shared/${rawToken}`;

    return {
      id: share.id,
      noteId: share.noteId,
      rawToken,
      shareUrl,
      permission: share.permission,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
    };
  }

  static async listSharesForNote(userId: string, noteId: string) {
    // Verify note ownership
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
    });
    if (!note) {
      throw ApiError.notFound('Note not found.');
    }

    return db.query.noteShares.findMany({
      where: eq(noteShares.noteId, noteId),
      orderBy: [desc(noteShares.createdAt)],
      columns: {
        id: true,
        noteId: true,
        permission: true,
        expiresAt: true,
        revokedAt: true,
        viewCount: true,
        lastAccessedAt: true,
        createdAt: true,
      },
    });
  }

  static async updateShare(userId: string, noteId: string, shareId: string, input: UpdateShareInput) {
    const share = await db.query.noteShares.findFirst({
      where: and(eq(noteShares.id, shareId), eq(noteShares.noteId, noteId), eq(noteShares.createdBy, userId)),
    });
    if (!share) {
      throw ApiError.notFound('Share configuration not found.');
    }

    const expiresAt = input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : share.expiresAt;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('Expiration time must be in the future.');
    }

    const [updated] = await db
      .update(noteShares)
      .set({
        permission: input.permission || share.permission,
        expiresAt,
      })
      .where(and(eq(noteShares.id, shareId), eq(noteShares.createdBy, userId)))
      .returning();

    return updated;
  }

  static async revokeShare(userId: string, noteId: string, shareId: string) {
    const share = await db.query.noteShares.findFirst({
      where: and(eq(noteShares.id, shareId), eq(noteShares.noteId, noteId), eq(noteShares.createdBy, userId)),
    });
    if (!share) {
      throw ApiError.notFound('Share configuration not found.');
    }

    const [updated] = await db
      .update(noteShares)
      .set({
        revokedAt: new Date(),
      })
      .where(eq(noteShares.id, shareId))
      .returning();

    return { success: true, revokedAt: updated.revokedAt };
  }

  // ----------------------------------------
  // Guest Access
  // ----------------------------------------
  static async getSharedNote(rawToken: string) {
    if (!rawToken || rawToken.length < 32) {
      throw ApiError.notFound('Invalid or malformed share token.');
    }

    const hash = this.hashToken(rawToken);
    const share = await db.query.noteShares.findFirst({
      where: eq(noteShares.tokenHash, hash),
    });

    if (!share) {
      throw ApiError.notFound('Shared note not found or link has expired.');
    }

    // Check revocation
    if (share.revokedAt) {
      throw ApiError.revoked('This share link has been revoked by the owner.');
    }

    // Check expiration
    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      throw ApiError.expired('This share link has expired.');
    }

    // Load note
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, share.noteId), isNull(notes.deletedAt)),
      columns: {
        id: true,
        title: true,
        content: true,
        plainText: true,
        contentFormat: true,
        version: true,
        updatedAt: true,
      },
    });

    if (!note) {
      throw ApiError.notFound('The shared note is no longer available.');
    }

    // If permission is comment or edit, fetch existing comments
    let comments: unknown[] = [];
    if (share.permission === 'comment' || share.permission === 'edit') {
      comments = await db.query.noteComments.findMany({
        where: and(eq(noteComments.noteId, note.id), isNull(noteComments.deletedAt)),
        orderBy: [desc(noteComments.createdAt)],
        columns: {
          id: true,
          guestDisplayName: true,
          content: true,
          createdAt: true,
        },
      });
    }

    // Record access telemetry
    await db
      .update(noteShares)
      .set({
        viewCount: sql`${noteShares.viewCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(noteShares.id, share.id));

    return {
      permission: share.permission,
      expiresAt: share.expiresAt,
      note,
      comments,
    };
  }

  static async addGuestComment(rawToken: string, guestDisplayName: string | undefined, content: string) {
    const text = content.trim();
    if (!text) {
      throw ApiError.badRequest('Comment cannot be empty.');
    }

    const hash = this.hashToken(rawToken);
    const share = await db.query.noteShares.findFirst({
      where: eq(noteShares.tokenHash, hash),
    });

    if (!share) {
      throw ApiError.notFound('Share link not found.');
    }

    if (share.revokedAt) {
      throw ApiError.revoked('Share link has been revoked.');
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      throw ApiError.expired('Share link has expired.');
    }

    if (share.permission !== 'comment' && share.permission !== 'edit') {
      throw ApiError.forbidden('This share link only grants view permissions.');
    }

    const commentId = `comment_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(noteComments)
      .values({
        id: commentId,
        noteId: share.noteId,
        shareId: share.id,
        guestDisplayName: guestDisplayName?.trim() || 'Guest Reader',
        content: text,
      })
      .returning();

    return created;
  }

  static async guestEditNote(
    rawToken: string,
    input: { title?: string; content?: string; plainText?: string; version: number }
  ) {
    const hash = this.hashToken(rawToken);
    const share = await db.query.noteShares.findFirst({
      where: eq(noteShares.tokenHash, hash),
    });

    if (!share) {
      throw ApiError.notFound('Share link not found.');
    }

    if (share.revokedAt) {
      throw ApiError.revoked('Share link has been revoked.');
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      throw ApiError.expired('Share link has expired.');
    }

    if (share.permission !== 'edit') {
      throw ApiError.forbidden('This share link does not grant editing permission.');
    }

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, share.noteId), isNull(notes.deletedAt)),
    });

    if (!note) {
      throw ApiError.notFound('Note not found.');
    }

    if (note.version !== input.version) {
      throw ApiError.conflict(
        `Conflict detected: Server has newer version (${note.version}) than client (${input.version}).`,
        [{ field: 'version', code: 'VERSION_MISMATCH', message: `Server version is ${note.version}` }]
      );
    }

    const nextVersion = note.version + 1;
    const title = input.title !== undefined ? input.title.trim() || 'Untitled' : note.title;
    const content = input.content !== undefined ? input.content : note.content;
    const plainText = input.plainText !== undefined ? input.plainText : note.plainText;

    const [updated] = await db
      .update(notes)
      .set({
        title,
        content,
        plainText,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, note.id))
      .returning();

    // Create revision snapshot
    await db.insert(noteRevisions).values({
      id: `rev_${crypto.randomUUID()}`,
      noteId: note.id,
      version: nextVersion,
      titleSnapshot: title,
      contentSnapshot: content,
      plainTextSnapshot: plainText,
      createdBy: null,
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      plainText: updated.plainText,
      version: updated.version,
      updatedAt: updated.updatedAt,
    };
  }

  // ----------------------------------------
  // Comment Moderation (Note Owner)
  // ----------------------------------------
  static async listCommentsForNote(userId: string, noteId: string) {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId), isNull(notes.deletedAt)),
    });
    if (!note) {
      throw ApiError.notFound('Note not found or does not belong to you.');
    }

    return db.query.noteComments.findMany({
      where: and(eq(noteComments.noteId, noteId), isNull(noteComments.deletedAt)),
      orderBy: [desc(noteComments.createdAt)],
      columns: {
        id: true,
        guestDisplayName: true,
        content: true,
        createdAt: true,
      },
    });
  }

  static async deleteComment(userId: string, noteId: string, commentId: string) {
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, noteId), eq(notes.ownerId, userId)),
    });
    if (!note) {
      throw ApiError.forbidden('Only the note owner can moderate comments.');
    }

    const comment = await db.query.noteComments.findFirst({
      where: and(eq(noteComments.id, commentId), eq(noteComments.noteId, noteId)),
    });
    if (!comment) {
      throw ApiError.notFound('Comment not found.');
    }

    await db
      .update(noteComments)
      .set({ deletedAt: new Date() })
      .where(eq(noteComments.id, commentId));

    return { success: true, id: commentId };
  }
}

