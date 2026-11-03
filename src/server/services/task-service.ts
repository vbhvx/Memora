import { db } from '@/db/client';
import { tasks, notes, noteRevisions } from '@/db/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { ApiError } from '../errors/api-error';
import crypto from 'crypto';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  assigneeName?: string | null;
  sourceNoteId?: string | null;
  sourceRevisionId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  assigneeName?: string | null;
}

export interface TaskSuggestionItem {
  title: string;
  description?: string | null;
  assigneeName?: string | null;
  dueDateText?: string | null;
  dueAt?: string | null;
  priority?: string;
}

export class TaskService {
  static async listTasks(
    userId: string,
    filters: {
      status?: string;
      priority?: string;
      sourceNoteId?: string;
      sort?: 'due' | 'created' | 'priority';
    } = {}
  ) {
    const conditions = [eq(tasks.ownerId, userId)];

    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status));
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    if (filters.sourceNoteId) {
      conditions.push(eq(tasks.sourceNoteId, filters.sourceNoteId));
    }

    return db.query.tasks.findMany({
      where: and(...conditions),
      orderBy: (tasks, { desc, asc }) => [
        filters.sort === 'due' ? asc(tasks.dueAt) : desc(tasks.createdAt),
      ],
      with: {
        sourceNote: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  static async createTask(userId: string, input: CreateTaskInput) {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw ApiError.badRequest('Task title is required.');
    }

    // Verify source note ownership if provided
    if (input.sourceNoteId) {
      const note = await db.query.notes.findFirst({
        where: and(eq(notes.id, input.sourceNoteId), eq(notes.ownerId, userId)),
      });
      if (!note) {
        throw ApiError.badRequest('Source note not found or does not belong to you.');
      }
    }

    const taskId = `task_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(tasks)
      .values({
        id: taskId,
        ownerId: userId,
        title: trimmedTitle,
        description: input.description || null,
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        assigneeName: input.assigneeName || null,
        sourceNoteId: input.sourceNoteId || null,
        sourceRevisionId: input.sourceRevisionId || null,
      })
      .returning();

    return created;
  }

  static async updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.ownerId, userId)),
    });
    if (!existing) {
      throw ApiError.notFound('Task not found.');
    }

    const nextStatus = input.status !== undefined ? input.status : existing.status;
    const completedAt =
      nextStatus === 'done' && existing.status !== 'done'
        ? new Date()
        : nextStatus !== 'done'
        ? null
        : existing.completedAt;

    const [updated] = await db
      .update(tasks)
      .set({
        title: input.title !== undefined ? input.title.trim() : existing.title,
        description: input.description !== undefined ? input.description : existing.description,
        status: nextStatus,
        priority: input.priority !== undefined ? input.priority : existing.priority,
        dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : existing.dueAt,
        assigneeName: input.assigneeName !== undefined ? input.assigneeName : existing.assigneeName,
        completedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, userId)))
      .returning();

    return updated;
  }

  static async deleteTask(userId: string, taskId: string) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.ownerId, userId)),
    });
    if (!existing) {
      throw ApiError.notFound('Task not found.');
    }

    await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, userId)));
    return { success: true, id: taskId };
  }

  static async createTasksFromSuggestions(
    userId: string,
    sourceNoteId: string,
    sourceRevisionId: string | null | undefined,
    items: TaskSuggestionItem[]
  ) {
    // Verify note ownership
    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, sourceNoteId), eq(notes.ownerId, userId)),
    });
    if (!note) {
      throw ApiError.notFound('Source note not found or does not belong to you.');
    }

    // Fetch existing tasks for this note to deduplicate
    const existingTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.ownerId, userId), eq(tasks.sourceNoteId, sourceNoteId)),
    });
    const existingTitleSet = new Set(existingTasks.map((t) => t.title.toLowerCase().trim()));

    const newlyCreated = [];

    for (const item of items) {
      const cleanTitle = item.title.trim();
      if (!cleanTitle || existingTitleSet.has(cleanTitle.toLowerCase())) {
        // Skip duplicate or empty
        continue;
      }

      existingTitleSet.add(cleanTitle.toLowerCase());

      const taskId = `task_${crypto.randomUUID()}`;
      const [created] = await db
        .insert(tasks)
        .values({
          id: taskId,
          ownerId: userId,
          title: cleanTitle,
          description: item.description || (item.dueDateText ? `Identified deadline: ${item.dueDateText}` : null),
          status: 'todo',
          priority: item.priority || 'medium',
          dueAt: item.dueAt ? new Date(item.dueAt) : null,
          assigneeName: item.assigneeName || null,
          sourceNoteId: sourceNoteId,
          sourceRevisionId: sourceRevisionId || null,
        })
        .returning();

      newlyCreated.push(created);
    }

    return {
      createdCount: newlyCreated.length,
      createdTasks: newlyCreated,
      totalExistingForNote: existingTasks.length,
    };
  }
}

