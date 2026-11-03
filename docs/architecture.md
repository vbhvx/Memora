# Memora System Architecture

Memora is designed with a layered TypeScript-first architecture that strictly separates core note management, authorization, database storage, and external AI integrations. This ensures the system remains robust, predictable, and fully operable even if third-party AI providers experience latency, rate limits, or downtime.

---

## 1. High-Level Architecture Diagram

```text
Browser Client (Next.js App Router, React 18, Tailwind CSS, Tiptap Editor)
  │
  ├────────────────────────────────────┬────────────────────────────────────┐
  ▼                                    ▼                                    ▼
Authenticated API Routes         Guest Share API Routes              Static & UI Routes
(/api/v1/notes, /tasks, etc.)    (/api/v1/shared/[token])            (/notes/[id], /shared/[token])
  │                                    │
  ▼                                    ▼
Session Guard & User Context     Token Validation & Hash Lookup
(HTTP-only JWT / Bearer)         (SHA-256 match, expiry, revocation)
  │                                    │
  └──────────────────┬─────────────────┘
                     ▼
         Input Validation Layer (Zod Runtime Schemas)
                     │
                     ▼
             Application Services
  ┌──────────────────┼──────────────────────────────┐
  ▼                  ▼                              ▼
NoteService    OrganizationService            ShareService
TaskService    SearchService                  AiService
  │                  │                              │
  ▼                  ▼                              ▼
Drizzle ORM    PostgreSQL FTS                  AI Provider Adapter
  │            (GIN Index, ts_rank_cd,          (Mock / Gemini / OpenAI)
  │             ts_headline excerpts)               │
  ▼                  ▼                              ▼
PostgreSQL Database                     External Model APIs
(Tables: users, notes, folders, tags,   (Strict JSON mode & Zod validation;
 note_tags, note_revisions, shares,      fallback heuristic provider)
 comments, tasks, ai_processing_jobs)
```

---

## 2. Core Architectural Principles

1. **AI as an Optional Workflow Layer:**  
   Core CRUD operations, search, tagging, folders, and sharing function independently of AI service availability.
2. **Reviewable Suggestions, Never Silent Mutations:**  
   AI models generate reviewable proposals (proposed titles, summaries, action lists) linked directly to the source revision (`sourceVersion`). They never silently overwrite or mutate user notes.
3. **Strict Zero-Knowledge Guest Sharing:**  
   Guest tokens grant access solely to the specific shared note. Guests cannot discover the owner's identity, email, folder tree, tags, or other notes.
4. **Optimistic Concurrency Control (OCC):**  
   All edit updates check the current note version. Stale edits are rejected with HTTP 409 Conflict without silent overwrites or lost work.
5. **PostgreSQL Native Full-Text Search:**  
   Fast, relevance-ranked (`ts_rank_cd`) queries with highlighted snippets (`ts_headline`), isolated strictly to the authorized user's tenant scope.

