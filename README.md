# Memora — AI-Powered Notes, Knowledge Organization & Action Management

Memora is a full-stack web application that helps individuals and teams capture information quickly, organize it intelligently, retrieve it efficiently, and turn ideas into actionable tasks — with AI assistance that proposes suggestions while keeping the user fully in control.

---

## Table of Contents

1. [Executive Summary & Core Principles](#1-executive-summary--core-principles)
2. [Feature Highlights](#2-feature-highlights)
3. [Architecture & Technology Stack](#3-architecture--technology-stack)
4. [Prerequisites & Local Setup](#4-prerequisites--local-setup)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Database Schema & Migrations](#6-database-schema--migrations)
7. [Running & Verification Commands](#7-running--verification-commands)
8. [Search Architecture (PostgreSQL FTS)](#8-search-architecture-postgresql-fts)
9. [AI Provider Integration & Privacy](#9-ai-provider-integration--privacy)
10. [Sharing Security Model & Guest Access](#10-sharing-security-model--guest-access)
11. [API Documentation (OpenAPI 3.x)](#11-api-documentation-openapi-3x)
12. [Data Deletion & Retention Policy](#12-data-deletion--retention-policy)
13. [Verification Report & Test Results](#13-verification-report--test-results)
14. [Known Limitations & Roadmap](#14-known-limitations--roadmap)

---

## 1. Executive Summary & Core Principles

Traditional note applications separate capturing information from acting upon it. Users collect meeting minutes, study material, research notes, and personal thoughts, but must manually summarize, retitle, and extract tasks.

Memora reduces this friction through:
- **Fast Note Capture:** Start writing immediately without mandatory classification fields.
- **AI As An Assistive Suggestion:** AI generates reviewable title suggestions, summaries, and action item proposals tied to specific note versions. AI never mutates user notes silently.
- **Frictionless Sharing:** Share individual notes via high-entropy cryptographically hashed links (`view`, `comment`, or `edit`) without requiring recipients to create an account.
- **Data Integrity & Isolation:** Strict multi-tenant authorization, optimistic concurrency control (OCC), and native PostgreSQL full-text search.

---

## 2. Feature Highlights

| Area | Implemented Capabilities |
|---|---|
| **Note Capture** | Rich-text editing with Tiptap (headings, lists, links, code blocks, blockquotes). |
| **Autosave** | Debounced (750ms) autosave with explicit status indicator (`Saving`, `Saved`, `Offline`, `Save failed`, `Conflict detected`). |
| **Concurrency (OCC)** | Version-based optimistic locking (`version` increments). Prevents silent overwrites with HTTP 409 conflict detection. |
| **Organization** | Folders, subfolders, tag management, pinned notes, and archiving. |
| **Full-Text Search** | Native PostgreSQL FTS with GIN index, `ts_rank_cd` relevance ranking, and `ts_headline` excerpts. |
| **AI Title Suggestion** | Suggests concise, high-signal titles based on content; reviewable with "Apply" or "Dismiss". |
| **AI Summarization** | Executive summaries with key bullet points tied to source note version. |
| **AI Action Extraction** | Parses commitments, assignees, deadlines, and excerpts with review checkboxes. |
| **Task Management** | Convert approved suggestions into tasks with deduplication; direct link back to source note. |
| **Guest Sharing** | 256-bit entropy tokens, SHA-256 storage, permissions (`view`, `comment`, `edit`), expiration, and instant revocation. |
| **Guest Experience** | Unauthenticated guest page (`/shared/[token]`) with disclosure banner and comment threads. |

---

## 3. Architecture & Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Rich-Text Framework:** Tiptap (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`)
- **Backend API:** Next.js Route Handlers (`/api/v1/...`)
- **Database:** PostgreSQL 16
- **ORM & Migrations:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `pg`)
- **Runtime Validation:** Zod schemas for paths, query parameters, request bodies, and AI outputs
- **Authentication:** Password hashing with `bcryptjs`, session verification via HTTP-only JWT cookies (`jose`)
- **Search Engine:** PostgreSQL native full-text search (`to_tsvector`, `plainto_tsquery`, `ts_rank_cd`, `ts_headline`)
- **AI Layer:** Provider-agnostic server-side adapter supporting intelligent heuristic fallback (zero API key dependency), Gemini API, and OpenAI API
- **Testing:** Vitest (Unit & Integration) and Playwright (End-to-End)

---

## 4. Prerequisites & Local Setup

### Prerequisites
- Node.js >= 18.x (tested on v26)
- PostgreSQL >= 14 (tested on v16)
- npm or pnpm

### Setup Steps
```bash
# 1. Clone repository & install dependencies
git clone <repo-url>
cd Memora
npm install --legacy-peer-deps

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local if you have custom database credentials or external AI keys

# 3. Create databases in PostgreSQL
psql -d postgres -c "CREATE DATABASE memora;"
psql -d postgres -c "CREATE DATABASE memora_test;"

# 4. Run database migrations
npm run db:migrate
```

---

## 5. Environment Variables Reference

See `.env.example` for reference:

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for development | `postgres://localhost:5432/memora` |
| `TEST_DATABASE_URL`| PostgreSQL connection string for automated test suites | `postgres://localhost:5432/memora_test` |
| `JWT_SECRET` | 32+ character random secret for signing session tokens | `your-secure-32-char-random-jwt-secret` |
| `APP_URL` | Base application URL used to format share links | `http://localhost:3000` |
| `AI_PROVIDER` | AI provider adapter (`mock`, `gemini`, `openai`) | `mock` |
| `AI_API_KEY` | Secret API key for chosen external provider (optional) | `""` |
| `AI_MODEL` | Model identifier (optional) | `memora-ai-mock-v1` |

---

## 6. Database Schema & Migrations

Database tables:
- `users`: User identity and bcrypt password hashes.
- `folders`: Hierarchical folders with parent-child foreign keys and owner scoping.
- `notes`: Note content (JSON/HTML), plain text, version, pinned/archived timestamps, and soft delete.
- `tags`: Unique tag taxonomy per user.
- `note_tags`: Many-to-many relationship table between notes and tags.
- `note_revisions`: Snapshot history preserving versioned title, content, and plaintext.
- `note_shares`: Cryptographic SHA-256 token hashes, permissions (`view`, `comment`, `edit`), expiration, and revocation timestamps.
- `note_comments`: Guest or user comments associated with notes and shares.
- `tasks`: Action items linked to source notes with statuses (`todo`, `in_progress`, `done`) and priorities.
- `ai_processing_jobs`: Audit records of AI operations, source versions, and model identifiers.

### Running Migrations
```bash
npm run db:migrate
```

---

## 7. Running & Verification Commands

```bash
# Start development server
npm run dev

# Run full Vitest suite (Unit, Integration, Security)
npm run test

# Run Playwright End-to-End tests
npm run test:e2e

# Production build & type-checking
npm run build

# Start production server
npm run start
```

---

## 8. Search Architecture (PostgreSQL FTS)

Memora implements full-text search directly within PostgreSQL:
- **GIN Index:**
  ```sql
  CREATE INDEX IF NOT EXISTS notes_fts_idx ON notes 
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(plain_text, '')));
  ```
- **Relevance Scoring:** Calculated using `ts_rank_cd` with title matches prioritized:
  ```sql
  SELECT n.*, ts_rank_cd(to_tsvector('english', ...), plainto_tsquery('english', $query)) AS rank
  FROM notes n
  WHERE n.owner_id = $userId AND n.deleted_at IS NULL AND ...
  ORDER BY rank DESC, n.updated_at DESC;
  ```
- **Dynamic Excerpts:** Snippets with search terms highlighted via `<mark>` are generated dynamically using `ts_headline`.
- **Tenant Isolation:** Search is strictly filtered by `owner_id = $userId`, preventing data leakage across users.

---

## 9. AI Provider Integration & Privacy

### Provider-Agnostic Adapter (`src/server/ai/provider.ts`)
1. **Mock Provider (Default):** Runs an intelligent heuristic NLP extractor without external network requests or API keys. It reliably extracts titles, summaries, and action items with assignees and deadlines.
2. **Gemini API:** Generates structured JSON responses using Google's Gemini models when `AI_PROVIDER=gemini` and `AI_API_KEY` are configured.
3. **OpenAI API:** Uses `response_format: { type: "json_object" }` with OpenAI models when `AI_PROVIDER=openai` and `AI_API_KEY` are configured.

### Privacy Safeguards
- API keys stay securely on the server and are never exposed to browser clients.
- Prompts, private note text, and tokens are redacted from operational logs.
- AI operations are triggered explicitly by user actions (no per-keystroke API calls).
- AI suggestions never modify note permissions or make notes public.

---

## 10. Sharing Security Model & Guest Access

### Cryptographic Token Storage
- When a share link is created, a 256-bit cryptographically secure random token (64 hex characters) is generated.
- Only the **SHA-256 hash** of this token is saved in PostgreSQL (`token_hash`).
- The usable token is returned once to the author to form the guest URL: `https://<domain>/shared/<rawToken>`.
- Raw tokens are never stored in the database, preventing guest link exposure in the event of database dumps.

### Access Scoping & Revocation
- **Zero-Knowledge Isolation:** Guests can only access the individual shared note. They cannot access other notes, folders, tags, or the author's account details.
- **Instant Revocation:** When the author clicks "Revoke", `revoked_at` is set to `NOW()`. All subsequent requests immediately fail with `403 Forbidden`.
- **Expiration:** Links past `expires_at` return `410 Gone`.
- **Cache-Control:** All shared endpoints emit `Cache-Control: no-store, no-cache, must-revalidate` to prevent caching of private content.

---

## 11. API Documentation (OpenAPI 3.x)

Full API contracts are documented in [`docs/openapi.yaml`](./docs/openapi.yaml) and [`docs/api.md`](./docs/api.md).

Representative endpoints:
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- Notes: `GET /api/v1/notes`, `POST /api/v1/notes`, `PATCH /api/v1/notes/:noteId`, `DELETE /api/v1/notes/:noteId`
- Search: `GET /api/v1/search?q=...`
- AI: `POST /api/v1/notes/:noteId/ai/title`, `POST /api/v1/notes/:noteId/ai/summary`, `POST /api/v1/notes/:noteId/ai/actions`
- Tasks: `GET /api/v1/tasks`, `POST /api/v1/tasks`, `POST /api/v1/tasks/from-suggestions`
- Shares: `POST /api/v1/notes/:noteId/shares`, `DELETE /api/v1/notes/:noteId/shares/:shareId`
- Guest: `GET /api/v1/shared/:token`, `POST /api/v1/shared/:token/comments`, `PATCH /api/v1/shared/:token/edit`

---

## 12. Data Deletion & Retention Policy

- **Soft Delete:** Deleting a note sets `deleted_at = NOW()`, excluding it from normal listings and search queries while preserving revision history.
- **Share Deletion:** Deleting a note immediately cascades to associated share links, preventing any further guest access.
- **Account Deletion:** Removing a user cascades to all owned notes, revisions, shares, tasks, folders, and tags.
- **Third-Party AI Retention:** When using external AI providers (Gemini/OpenAI), data transmission follows the provider's API privacy terms.

---

## 13. Verification Report & Test Results

### Automated Test Execution
- **Unit & Integration Suite (Vitest):**
  - **45 tests passed** across 10 test files.
  - Duration: ~1.9s.
  - Verified: Zod schemas, crypto token hashing, password authentication, optimistic concurrency (409 conflict detection), folder/tag isolation, PostgreSQL FTS ranking and excerpts, AI structured outputs, deduplicated task conversion, guest sharing permissions (`view`/`comment`/`edit`), immediate revocation, and 14 explicit security authorization boundaries.
- **End-to-End Suite (Playwright):**
  - **2 tests passed** across full user journeys.
  - Verified: User registration -> Quick capture -> Rich text editing -> Autosave -> Persistence after reload -> AI title suggestions -> AI summarization -> Action extraction and approval -> Tasks dashboard -> Guest share creation -> Unauthenticated guest viewing -> Guest commenting -> Instant link revocation -> Search filtering.
- **Build Verification:**
  - `npm run build` compiled all server routes, API endpoints, and client pages with zero TypeScript errors.

---

## 14. Known Limitations & Roadmap

- **Single-Node PostgreSQL Search:** Full-text search leverages PostgreSQL native `tsvector` and `ts_rank_cd`. While optimal for small-to-medium teams, multi-million note archives will benefit from dedicated search indexes or pgvector embeddings.
- **Offline Sync:** The editor flags offline status; offline queueing with ServiceWorkers and local IndexedDB sync is planned for release v1.2.
- **Operational Transformation / CRDTs:** Multi-user concurrent editing currently employs optimistic concurrency control (OCC with version validation). Real-time character-level collaboration (Yjs/CRDTs) is slated for v2.0.
