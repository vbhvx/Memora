import { describe, it, expect } from 'vitest';
import {
  createNoteSchema,
  updateNoteSchema,
  createTaskSchema,
  tasksFromSuggestionsSchema,
  createShareSchema,
  searchQuerySchema,
} from '@/server/validation/schemas';
import {
  aiTitleResponseSchema,
  aiSummaryResponseSchema,
  aiActionsResponseSchema,
} from '@/server/ai/schemas';

describe('Unit: Request Validation Schemas', () => {
  it('validates default note creation payload', () => {
    const res = createNoteSchema.parse({});
    expect(res.title).toBe('Untitled');
    expect(res.content).toBe('');
    expect(res.isPinned).toBe(false);
  });

  it('rejects oversized note title', () => {
    const longTitle = 'a'.repeat(300);
    expect(() => createNoteSchema.parse({ title: longTitle })).toThrow();
  });

  it('validates optimistic concurrency version field in updateNoteSchema', () => {
    const res = updateNoteSchema.parse({ title: 'New Title', version: 2 });
    expect(res.version).toBe(2);
    expect(res.title).toBe('New Title');
  });

  it('validates task creation and required title', () => {
    expect(() => createTaskSchema.parse({ title: '' })).toThrow();
    const task = createTaskSchema.parse({ title: 'Write tests', priority: 'high' });
    expect(task.priority).toBe('high');
    expect(task.status).toBe('todo');
  });

  it('validates tasksFromSuggestionsSchema', () => {
    const payload = {
      sourceNoteId: 'note_123',
      sourceRevisionId: 'rev_1',
      items: [
        {
          title: 'Review auth flow',
          assigneeName: 'Priya',
          dueDateText: 'by Friday',
        },
      ],
    };
    const parsed = tasksFromSuggestionsSchema.parse(payload);
    expect(parsed.items.length).toBe(1);
    expect(parsed.items[0].title).toBe('Review auth flow');
  });

  it('validates share permissions and rejects invalid permission strings', () => {
    expect(() => createShareSchema.parse({ permission: 'admin' as unknown as 'view' })).toThrow();
    const valid = createShareSchema.parse({ permission: 'view' });
    expect(valid.permission).toBe('view');
  });

  it('validates AI structured output schemas', () => {
    const titleRes = aiTitleResponseSchema.parse({
      title: 'Architectural Blueprint',
      explanation: 'Derived from opening header',
    });
    expect(titleRes.title).toBe('Architectural Blueprint');

    const summaryRes = aiSummaryResponseSchema.parse({
      summary: 'A short summary.',
      keyPoints: ['point 1', 'point 2'],
      sourceVersion: 3,
    });
    expect(summaryRes.keyPoints.length).toBe(2);

    const actionsRes = aiActionsResponseSchema.parse({
      items: [
        {
          title: 'Submit report',
          assigneeName: null,
          dueDateText: 'tomorrow',
          confidence: 0.95,
          sourceExcerpt: 'Submit the report tomorrow',
        },
      ],
    });
    expect(actionsRes.items[0].confidence).toBe(0.95);
  });
});
