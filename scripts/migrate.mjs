import pg from 'pg';
const { Pool } = pg;

export const schemaSql = `
-- Enable uuid extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS folders_owner_idx ON folders(owner_id);
CREATE INDEX IF NOT EXISTS folders_parent_idx ON folders(parent_id);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  plain_text TEXT NOT NULL DEFAULT '',
  content_format TEXT NOT NULL DEFAULT 'tiptap_json',
  version INTEGER NOT NULL DEFAULT 1,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notes_owner_idx ON notes(owner_id);
CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes(folder_id);
CREATE INDEX IF NOT EXISTS notes_pinned_idx ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS notes_archived_idx ON notes(archived_at);
CREATE INDEX IF NOT EXISTS notes_deleted_idx ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS notes_updated_idx ON notes(updated_at);

-- Full-text search GIN index on title and plain_text
CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(plain_text, '')));

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tags_owner_idx ON tags(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS tags_owner_name_idx ON tags(owner_id, LOWER(name));

-- NoteTags join table
CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (note_id, tag_id)
);
CREATE INDEX IF NOT EXISTS note_tags_note_idx ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS note_tags_tag_idx ON note_tags(tag_id);

-- NoteRevisions table
CREATE TABLE IF NOT EXISTS note_revisions (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title_snapshot TEXT NOT NULL,
  content_snapshot TEXT NOT NULL,
  plain_text_snapshot TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS note_revisions_note_idx ON note_revisions(note_id);
CREATE UNIQUE INDEX IF NOT EXISTS note_revisions_note_version_idx ON note_revisions(note_id, version);

-- NoteShares table
CREATE TABLE IF NOT EXISTS note_shares (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  permission TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS note_shares_note_idx ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS note_shares_token_hash_idx ON note_shares(token_hash);
CREATE INDEX IF NOT EXISTS note_shares_revoked_idx ON note_shares(revoked_at);

-- NoteComments table
CREATE TABLE IF NOT EXISTS note_comments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  share_id TEXT REFERENCES note_shares(id) ON DELETE SET NULL,
  author_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_display_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS note_comments_note_idx ON note_comments(note_id);
CREATE INDEX IF NOT EXISTS note_comments_share_idx ON note_comments(share_id);
CREATE INDEX IF NOT EXISTS note_comments_created_idx ON note_comments(created_at);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  source_revision_id TEXT REFERENCES note_revisions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_at TIMESTAMPTZ,
  assignee_id TEXT,
  assignee_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS tasks_owner_idx ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS tasks_source_note_idx ON tasks(source_note_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_at);

-- AIProcessingJobs table
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_version INTEGER NOT NULL,
  model_identifier TEXT NOT NULL,
  result_json TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_jobs_note_idx ON ai_processing_jobs(note_id);
CREATE INDEX IF NOT EXISTS ai_jobs_user_idx ON ai_processing_jobs(user_id);
`;

export async function runMigrations(connString) {
  const target = connString || process.env.DATABASE_URL || 'postgres://localhost:5432/memora';
  console.log(`Connecting to ${target} for migration...`);
  const pool = new Pool({ connectionString: target });
  try {
    await pool.query(schemaSql);
    console.log(`✓ Migration completed successfully for ${target}`);
  } catch (err) {
    console.error(`Migration error for ${target}:`, err);
    throw err;
  } finally {
    await pool.end();
  }
}

// If run directly from CLI
if (process.argv[1].endsWith('migrate.mjs')) {
  const targetDb = process.argv[2] || process.env.DATABASE_URL || 'postgres://localhost:5432/memora';
  runMigrations(targetDb)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

