import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { NoteService } from '@/server/services/note-service';
import { ShareService } from '@/server/services/share-service';
import { ApiError } from '@/server/errors/api-error';
import crypto from 'crypto';

describe('Integration: Frictionless Sharing, Guest Access & Security Isolation', () => {
  let ownerId: string;
  let otherUserId: string;

  beforeAll(async () => {
    ownerId = `usr_${crypto.randomUUID()}`;
    otherUserId = `usr_${crypto.randomUUID()}`;

    await db.insert(users).values([
      { id: ownerId, email: `share_owner_${Date.now()}@example.com`, name: 'Owner User', passwordHash: 'hash' },
      { id: otherUserId, email: `share_other_${Date.now()}@example.com`, name: 'Other User', passwordHash: 'hash' },
    ]);
  });

  it('creates a secure share link with SHA-256 token hash', async () => {
    const note = await NoteService.createNote(ownerId, {
      title: 'Shared Project Proposal',
      content: 'Draft content for external review.',
      plainText: 'Draft content for external review.',
    });

    const share = await ShareService.createShare(ownerId, note.id, {
      permission: 'view',
    });

    expect(share.rawToken).toBeDefined();
    expect(share.rawToken.length).toBe(64);
    expect(share.shareUrl).toContain(share.rawToken);
    expect(share.permission).toBe('view');

    // Verify token hash is stored, not raw token
    const list = await ShareService.listSharesForNote(ownerId, note.id);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(share.id);
    expect((list[0] as any).rawToken).toBeUndefined();
  });

  it('allows unauthenticated guest to view shared note without account', async () => {
    const note = await NoteService.createNote(ownerId, {
      title: 'Public Knowledge Base Entry',
      content: 'Visible to guest link holders.',
      plainText: 'Visible to guest link holders.',
    });

    const share = await ShareService.createShare(ownerId, note.id, {
      permission: 'view',
    });

    const guestView = await ShareService.getSharedNote(share.rawToken);
    expect(guestView.note.title).toBe('Public Knowledge Base Entry');
    expect(guestView.permission).toBe('view');
    // Ensure ownerId and sensitive fields are not leaked in note
    expect((guestView.note as any).ownerId).toBeUndefined();
  });

  it('enforces view-only permission by rejecting guest comments', async () => {
    const note = await NoteService.createNote(ownerId, { title: 'Read-only document' });
    const share = await ShareService.createShare(ownerId, note.id, { permission: 'view' });

    await expect(
      ShareService.addGuestComment(share.rawToken, 'Guest', 'Trying to comment on view-only note')
    ).rejects.toThrow(ApiError);
  });

  it('allows guest comments when permission is "comment"', async () => {
    const note = await NoteService.createNote(ownerId, { title: 'Reviewable Document' });
    const share = await ShareService.createShare(ownerId, note.id, { permission: 'comment' });

    const comment = await ShareService.addGuestComment(share.rawToken, 'Alice External', 'Great proposal!');
    expect(comment.id).toBeDefined();
    expect(comment.guestDisplayName).toBe('Alice External');
    expect(comment.content).toBe('Great proposal!');

    const guestView = await ShareService.getSharedNote(share.rawToken);
    expect(guestView.comments.length).toBe(1);
  });

  it('allows guest edit when permission is "edit" with version check', async () => {
    const note = await NoteService.createNote(ownerId, {
      title: 'Collaborative Document',
      content: 'Original draft',
      plainText: 'Original draft',
    });

    const share = await ShareService.createShare(ownerId, note.id, { permission: 'edit' });

    const edited = await ShareService.guestEditNote(share.rawToken, {
      title: 'Guest Collaborator Revision',
      content: 'Updated by guest',
      plainText: 'Updated by guest',
      version: 1, // matches note version
    });

    expect(edited.version).toBe(2);
    expect(edited.title).toBe('Guest Collaborator Revision');

    // Stale version rejected
    await expect(
      ShareService.guestEditNote(share.rawToken, {
        content: 'Conflict attempt',
        version: 1,
      })
    ).rejects.toThrow(ApiError);
  });

  it('instantly revokes access when owner revokes share link', async () => {
    const note = await NoteService.createNote(ownerId, { title: 'Revocable Share' });
    const share = await ShareService.createShare(ownerId, note.id, { permission: 'view' });

    // Verify it works initially
    const initialView = await ShareService.getSharedNote(share.rawToken);
    expect(initialView.note.id).toBe(note.id);

    // Revoke share
    await ShareService.revokeShare(ownerId, note.id, share.id);

    // Subsequent access fails immediately with REVOKED error
    await expect(ShareService.getSharedNote(share.rawToken)).rejects.toThrow(ApiError);
  });

  it('rejects access to expired share links', async () => {
    const note = await NoteService.createNote(ownerId, { title: 'Expiring Note' });
    // Past expiration time test
    const share = await ShareService.createShare(ownerId, note.id, {
      permission: 'view',
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });

    // Wait 1.1s for expiration
    await new Promise((r) => setTimeout(r, 1100));

    await expect(ShareService.getSharedNote(share.rawToken)).rejects.toThrow(ApiError);
  });

  it('records view count telemetry and updates last accessed timestamp upon guest view', async () => {
    const note = await NoteService.createNote(ownerId, { title: 'Telemetry Tracked Note' });
    const share = await ShareService.createShare(ownerId, note.id, { permission: 'view' });

    const beforeView = await ShareService.listSharesForNote(ownerId, note.id);
    const targetBefore = beforeView.find((s) => s.id === share.id);
    expect(targetBefore?.viewCount).toBe(0);
    expect(targetBefore?.lastAccessedAt).toBeNull();

    // Guest accesses twice
    await ShareService.getSharedNote(share.rawToken);
    await ShareService.getSharedNote(share.rawToken);

    const afterView = await ShareService.listSharesForNote(ownerId, note.id);
    const targetAfter = afterView.find((s) => s.id === share.id);
    expect(targetAfter?.viewCount).toBe(2);
    expect(targetAfter?.lastAccessedAt).not.toBeNull();
  });

  it('moderates guest comments by allowing note owner to delete comments and rejecting non-owners', async () => {
    const note = await NoteService.createNote(ownerId, { title: 'Comment Moderation Note' });
    const share = await ShareService.createShare(ownerId, note.id, { permission: 'comment' });

    // Guest adds comment
    const comment = await ShareService.addGuestComment(
      share.rawToken,
      'Test Reviewer',
      'Inappropriate spam comment that should be moderated'
    );
    expect(comment.id).toBeDefined();

    // Other user attempts to moderate - fails
    await expect(
      ShareService.deleteComment(otherUserId, note.id, comment.id)
    ).rejects.toThrow(ApiError);

    // Note owner moderates - succeeds
    const modResult = await ShareService.deleteComment(ownerId, note.id, comment.id);
    expect(modResult.success).toBe(true);

    // Verify comment is no longer returned in un-deleted list
    const remaining = await ShareService.listCommentsForNote(ownerId, note.id);
    expect(remaining.some((c) => c.id === comment.id)).toBe(false);
  });
});

