import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// 1. Users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Folders
export const folders = pgTable(
  'folders',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('folders_owner_idx').on(table.ownerId),
    index('folders_parent_idx').on(table.parentId),
  ]
);

// 3. Notes
export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
    title: text('title').notNull().default('Untitled'),
    content: text('content').notNull().default(''),
    plainText: text('plain_text').notNull().default(''),
    contentFormat: text('content_format').notNull().default('tiptap_json'),
    version: integer('version').notNull().default(1),
    isPinned: boolean('is_pinned').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notes_owner_idx').on(table.ownerId),
    index('notes_folder_idx').on(table.folderId),
    index('notes_pinned_idx').on(table.isPinned),
    index('notes_archived_idx').on(table.archivedAt),
    index('notes_deleted_idx').on(table.deletedAt),
    index('notes_updated_idx').on(table.updatedAt),
  ]
);

// 4. Tags
export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('tags_owner_idx').on(table.ownerId),
    uniqueIndex('tags_owner_name_idx').on(table.ownerId, table.name),
  ]
);

// 5. NoteTags (many-to-many)
export const noteTags = pgTable(
  'note_tags',
  {
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.noteId, table.tagId] }),
    index('note_tags_note_idx').on(table.noteId),
    index('note_tags_tag_idx').on(table.tagId),
  ]
);

// 6. NoteRevisions
export const noteRevisions = pgTable(
  'note_revisions',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    titleSnapshot: text('title_snapshot').notNull(),
    contentSnapshot: text('content_snapshot').notNull(),
    plainTextSnapshot: text('plain_text_snapshot').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: text('created_by'),
  },
  (table) => [
    index('note_revisions_note_idx').on(table.noteId),
    uniqueIndex('note_revisions_note_version_idx').on(table.noteId, table.version),
  ]
);

// 7. NoteShares
export const noteShares = pgTable(
  'note_shares',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    permission: text('permission').notNull().default('view'), // 'view' | 'comment' | 'edit'
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('note_shares_note_idx').on(table.noteId),
    index('note_shares_token_hash_idx').on(table.tokenHash),
  ]
);

// 8. NoteComments
export const noteComments = pgTable(
  'note_comments',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    shareId: text('share_id').references(() => noteShares.id, { onDelete: 'set null' }),
    authorUserId: text('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    guestDisplayName: text('guest_display_name'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('note_comments_note_idx').on(table.noteId),
    index('note_comments_share_idx').on(table.shareId),
    index('note_comments_created_idx').on(table.createdAt),
  ]
);

// 9. Tasks
export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceNoteId: text('source_note_id').references(() => notes.id, { onDelete: 'set null' }),
    sourceRevisionId: text('source_revision_id').references(() => noteRevisions.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('todo'), // 'todo' | 'in_progress' | 'done'
    priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high'
    dueAt: timestamp('due_at', { withTimezone: true }),
    assigneeId: text('assignee_id'),
    assigneeName: text('assignee_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('tasks_owner_idx').on(table.ownerId),
    index('tasks_source_note_idx').on(table.sourceNoteId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_idx').on(table.dueAt),
  ]
);

// 10. AI Processing Jobs
export const aiProcessingJobs = pgTable(
  'ai_processing_jobs',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operation: text('operation').notNull(), // 'generate_title' | 'summarize' | 'extract_actions'
    status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'failed'
    sourceVersion: integer('source_version').notNull(),
    modelIdentifier: text('model_identifier').notNull(),
    resultJson: text('result_json'),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('ai_jobs_note_idx').on(table.noteId),
    index('ai_jobs_user_idx').on(table.userId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
  folders: many(folders),
  tags: many(tags),
  tasks: many(tasks),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(users, { fields: [folders.ownerId], references: [users.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folder_subfolders' }),
  subfolders: many(folders, { relationName: 'folder_subfolders' }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  owner: one(users, { fields: [notes.ownerId], references: [users.id] }),
  folder: one(folders, { fields: [notes.folderId], references: [folders.id] }),
  noteTags: many(noteTags),
  revisions: many(noteRevisions),
  shares: many(noteShares),
  comments: many(noteComments),
  tasks: many(tasks),
  aiJobs: many(aiProcessingJobs),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  owner: one(users, { fields: [tags.ownerId], references: [users.id] }),
  noteTags: many(noteTags),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, { fields: [noteTags.noteId], references: [notes.id] }),
  tag: one(tags, { fields: [noteTags.tagId], references: [tags.id] }),
}));

export const noteSharesRelations = relations(noteShares, ({ one, many }) => ({
  note: one(notes, { fields: [noteShares.noteId], references: [notes.id] }),
  user: one(users, { fields: [noteShares.createdBy], references: [users.id] }),
  comments: many(noteComments),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  owner: one(users, { fields: [tasks.ownerId], references: [users.id] }),
  sourceNote: one(notes, { fields: [tasks.sourceNoteId], references: [notes.id] }),
}));

