import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users, tasks } from '@/db/schema';
import { NoteService } from '@/server/services/note-service';
import { TaskService } from '@/server/services/task-service';
import { getAiProvider } from '@/server/ai/provider';
import crypto from 'crypto';

describe('Integration: AI Workflows, Source Versioning & Task Extraction', () => {
  let userId: string;

  beforeAll(async () => {
    userId = `usr_${crypto.randomUUID()}`;
    await db.insert(users).values({
      id: userId,
      email: `ai_test_${Date.now()}@example.com`,
      name: 'AI Workflow Tester',
      passwordHash: 'hash',
    });
  });

  it('generates title suggestion preserving source context', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Untitled',
      content: '# Distributed Systems Consensus\nRaft protocol implementation details.',
      plainText: 'Distributed Systems Consensus Raft protocol implementation details.',
    });

    const provider = getAiProvider();
    const titleSuggestion = await provider.generateTitle(note.plainText, note.title);

    expect(titleSuggestion.title).toBeDefined();
    expect(titleSuggestion.title).toContain('Distributed Systems');

    // Note in DB is unchanged until user explicitly applies suggestion
    const fresh = await NoteService.getNoteById(userId, note.id);
    expect(fresh.title).toBe('Untitled');
  });

  it('generates summary tied to source version', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Project Alpha Review',
      content: 'We met with leadership. Priority is security hardening. Beta launch scheduled for next month.',
      plainText: 'We met with leadership. Priority is security hardening. Beta launch scheduled for next month.',
    });

    const provider = getAiProvider();
    const summaryRes = await provider.generateSummary(note.plainText, note.version);

    expect(summaryRes.sourceVersion).toBe(note.version);
    expect(summaryRes.summary).toBeDefined();
    expect(summaryRes.keyPoints.length).toBeGreaterThan(0);
  });

  it('extracts actions and converts approved suggestions into tasks with deduplication', async () => {
    const note = await NoteService.createNote(userId, {
      title: 'Launch Checklist',
      content:
        'Review the API security documentation. Ask Priya to verify the permission rules. Submit the audit report by Friday.',
      plainText:
        'Review the API security documentation. Ask Priya to verify the permission rules. Submit the audit report by Friday.',
    });

    const provider = getAiProvider();
    const actionsRes = await provider.extractActions(note.plainText, note.version);

    expect(actionsRes.items.length).toBeGreaterThanOrEqual(2);

    // Convert approved suggestions into tasks
    const convertRes = await TaskService.createTasksFromSuggestions(
      userId,
      note.id,
      null,
      actionsRes.items.map((i) => ({
        title: i.title,
        description: i.description,
        assigneeName: i.assigneeName,
        dueDateText: i.dueDateText,
      }))
    );

    expect(convertRes.createdCount).toBeGreaterThan(0);

    // Verify task exists in database and links to source note
    const userTasks = await TaskService.listTasks(userId, { sourceNoteId: note.id });
    expect(userTasks.length).toBe(convertRes.createdCount);
    expect(userTasks[0].sourceNote?.id).toBe(note.id);

    // Repeated submission of same suggestions should be deduplicated
    const retryRes = await TaskService.createTasksFromSuggestions(
      userId,
      note.id,
      null,
      actionsRes.items.map((i) => ({
        title: i.title,
        description: i.description,
      }))
    );

    expect(retryRes.createdCount).toBe(0); // 0 new tasks created due to deduplication!
  });
});

