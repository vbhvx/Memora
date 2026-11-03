import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createNoteSchema = z.object({
  title: z.string().max(255).default('Untitled'),
  content: z.string().max(1000000).default(''),
  plainText: z.string().max(1000000).default(''),
  folderId: z.string().nullable().optional(),
  contentFormat: z.enum(['tiptap_json', 'html', 'plain']).default('tiptap_json'),
  isPinned: z.boolean().default(false),
  tagIds: z.array(z.string()).default([]),
});

export const updateNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().max(1000000).optional(),
  plainText: z.string().max(1000000).optional(),
  folderId: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  version: z.number().int().positive().optional(),
});

export const noteTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(100),
  parentId: z.string().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(100).optional(),
  parentId: z.string().nullable().optional(),
});

export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tag name is required')
    .max(50)
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Tag name can only contain letters, numbers, hyphens, and underscores'),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(255),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeName: z.string().max(100).nullable().optional(),
  sourceNoteId: z.string().nullable().optional(),
  sourceRevisionId: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeName: z.string().max(100).nullable().optional(),
});

export const tasksFromSuggestionsSchema = z.object({
  sourceNoteId: z.string(),
  sourceRevisionId: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(255),
        description: z.string().max(2000).nullable().optional(),
        assigneeName: z.string().max(100).nullable().optional(),
        dueDateText: z.string().nullable().optional(),
        dueAt: z.string().datetime().nullable().optional(),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
      })
    )
    .min(1, 'At least one task suggestion is required'),
});

export const createShareSchema = z.object({
  permission: z.enum(['view', 'comment', 'edit']).default('view'),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updateShareSchema = z.object({
  permission: z.enum(['view', 'comment', 'edit']).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const createCommentSchema = z.object({
  guestDisplayName: z.string().trim().max(50).optional(),
  content: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const guestEditNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().max(1000000).optional(),
  plainText: z.string().max(1000000).optional(),
  version: z.number().int().positive(),
});

export const searchQuerySchema = z.object({
  q: z.string().default(''),
  folderId: z.string().optional(),
  tag: z.string().optional(),
  pinned: z.enum(['true', 'false']).optional(),
  archived: z.enum(['true', 'false']).optional(),
  sort: z.enum(['updated', 'created', 'title', 'rank']).default('updated'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

