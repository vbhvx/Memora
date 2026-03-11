# Technical Specification: AI-Powered Notes, Knowledge Organization & Action Management Platform

**Project Type:** Full-Stack Web Application  
**Primary Focus:** Note Capture, AI-Assisted Summarization, Intelligent Search, Task Extraction, Knowledge Organization, and Frictionless Collaboration  
**Target Users:** Students, developers, professionals, creators, and small teams  
**Engineering Objective:** Build a secure, responsive note-taking platform that transforms unstructured notes into searchable knowledge and actionable work while allowing people to collaborate without unnecessary account-creation barriers.

## 1. Objective

Build an AI-powered note management platform that helps users capture information quickly, organize it intelligently, retrieve it efficiently, and turn ideas into actionable tasks.

Traditional note-taking applications often separate capturing information from doing something useful with it. Users collect meeting notes, study material, research, technical documentation, and personal thoughts, but must manually organize, summarize, title, and extract tasks from their content.

The platform should reduce this friction through a combination of fast note capture, conventional information-management features, AI-assisted workflows, and lightweight sharing.

The core product principle is:

**Capture information once, retrieve it when needed, understand it quickly, and convert it into action.**

The application must allow users to:

1. Create and edit notes with minimal friction.
2. Organize notes through folders, tags, pinning, archiving, and other practical mechanisms.
3. Search across note titles and content.
4. Generate meaningful titles and concise summaries with AI.
5. Extract potential action items, deadlines, and assignments from notes.
6. Review and approve AI-generated changes before they affect the user's data.
7. Share individual notes through controlled links, including access for recipients who do not have accounts.
8. Collaborate within clearly defined viewing, commenting, and editing permissions where supported.
9. Protect private notes, shared content, credentials, and AI-processed information.
10. Maintain predictable behavior across the frontend, backend, database, and AI integrations.

The objective is not to create another basic text editor or an autonomous AI agent. It is to build a practical knowledge-management system in which AI improves the user's workflow without taking control away from the user.

## 2. Core Product Requirements

The application must include the following capabilities.

| Capability | Required behavior |
|---|---|
| Note capture | Create, edit, save, and delete notes |
| Rich text | Support readable formatting, headings, lists, links, and code blocks |
| Autosave | Persist changes and communicate save status |
| Organization | Support folders, tags, pinned notes, and archiving |
| Search | Search titles and content, with useful filtering and ranking |
| AI title generation | Suggest concise titles based on note content |
| AI summarization | Generate concise summaries that preserve important information |
| Action extraction | Identify tasks, potential assignees, deadlines, and supporting context |
| Task management | Convert approved extracted actions into editable tasks |
| Lightweight sharing | Provide controlled share links without mandatory recipient accounts |
| Collaboration | Support explicit access levels for viewers, commenters, and editors where implemented |
| Privacy | Enforce ownership, permissions, sharing expiration, and revocation |
| Reliability | Handle failed saves, conflicts, expired links, AI failures, and network interruptions |
| Documentation | Provide setup instructions, API contracts, tests, and a clear security model |

Treat each capability as a testable feature rather than a visual placeholder.

## 3. Product Scope and User Experience

### 3.1 Primary application screens

**Dashboard**

Display recent notes, pinned notes, recently updated content, and a quick-capture entry point.

The dashboard should help users resume work immediately rather than requiring them to navigate through multiple folders before capturing information.

**Notes workspace**

Provide an editing and reading environment containing:

- Note title
- Rich-text content editor
- Save-status indicator
- Folder and tag controls
- Pin and archive actions
- AI assistance controls
- Sharing and permission settings
- Created and updated timestamps

**Search**

Provide a central search experience with:

- Title matching
- Full-text content matching
- Relevant result excerpts
- Folder and tag filters
- Pinned and archived filters
- Recent-result ranking where useful

Only display notes the current user is authorized to access.

**Tasks and action items**

Display actions extracted from notes and tasks created manually by users.

Users should be able to review task status, edit task descriptions, set due dates, and navigate back to the note from which an action originated.

**Shared note view**

Provide a lightweight page through which an invited recipient can access a specific shared note without registering for a full account when the share configuration permits guest access.

The page must disclose the granted permission and provide only the actions the share author has explicitly allowed.

**Settings and account management**

Allow users to manage their account, session, preferences, AI settings, and active share links.

### 3.2 Quick capture

Minimize the number of steps required to create a note.

A user should be able to open the application, enter a title or content, and save a note without completing unnecessary classification fields.

The system may apply sensible defaults, such as placing a new note in an Inbox folder, but should not require the user to select a folder, tag, category, or AI mode before writing.

The application should not generate a title or call an AI service automatically for every keystroke.

Instead, provide explicit AI actions and optional user-controlled automation settings.

### 3.3 Save behavior

Implement reliable autosave with a clear state indicator:

- `Saving`
- `Saved`
- `Offline`
- `Save failed`
- `Conflict detected`

Use a debounced save mechanism to reduce unnecessary requests while preserving edits.

The application must distinguish unsaved content from persisted content. A note should never be displayed as successfully saved solely because the editor updated its local state.

When a save fails, preserve the user's current content and provide a retry mechanism.

Define an explicit conflict strategy for concurrent edits. For the initial release, optimistic concurrency control using a note version or revision number is sufficient. Do not silently overwrite a newer version of a note with stale content.

## 4. Technical Stack

Use a TypeScript-first architecture that keeps the application maintainable and allows AI functionality to evolve independently of ordinary note operations.

| Layer | Recommended technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Rich-text editor | Tiptap or another maintained editor framework |
| Backend | Next.js route handlers or a dedicated Node.js API |
| Database | PostgreSQL |
| ORM | Drizzle ORM or Prisma |
| Runtime validation | Zod or an equivalent schema validator |
| Search | PostgreSQL full-text search |
| AI integration | Provider-agnostic server-side adapter |
| Authentication | Maintained authentication and session library |
| API documentation | OpenAPI 3.x where an external API is exposed |
| Unit and integration testing | Vitest or Jest |
| End-to-end testing | Playwright |
| Deployment | Supported application hosting with managed PostgreSQL |

Select one ORM and one primary server architecture.

For the first release, PostgreSQL full-text search is sufficient. Do not introduce a separate vector database or search cluster until actual product requirements justify the additional complexity.

The AI provider and specific model must be configurable. Do not hard-code an assumed provider's availability, pricing, capabilities, or service-level guarantees.

## 5. System Architecture

Separate the application into clear layers so that ordinary note operations remain reliable even when AI services are unavailable.

```text
Browser
  |
  v
Frontend and Rich-Text Editor
  |
  v
Authenticated API / Guest Share API
  |
  v
Authentication and Access Control
  |
  v
Input Validation
  |
  v
Application Services
  |
  +--------------------+
  |                    |
  v                    v
PostgreSQL          AI Service Adapter
  |                    |
  v                    v
Notes, Tasks,       Title Suggestions,
Shares, Revisions   Summaries, Action Items
  |
  v
Search Indexes and Activity Metadata
```

Important architectural rules:

- The browser must never receive the AI provider's secret API key.
- The backend must authorize requests before returning private note content.
- Guest share links must grant access only to the resources and capabilities associated with that share.
- AI processing must not implicitly make a note public or shared.
- AI failures must not prevent users from reading or editing already-saved notes.
- Search must respect the current user's data-access scope.
- Database updates and task creation must preserve integrity.
- Sensitive note content must not be unnecessarily written to application logs.

Treat AI as an optional capability layered on top of a reliable note-management system, not as a dependency for basic CRUD operations.

## 6. Data Model

Use relational data modeling, appropriate indexes, explicit ownership, and version tracking.

### 6.1 User

Fields:

- `id`
- `email`
- `name`
- `createdAt`
- `updatedAt`

Authentication fields should be managed by the selected authentication system, with password hashes or external identity references stored according to that system's requirements.

### 6.2 Note

Fields:

- `id`
- `ownerId`
- `folderId`
- `title`
- `content`
- `contentFormat`
- `createdAt`
- `updatedAt`
- `version`
- `isPinned`
- `archivedAt`
- `deletedAt`

Use a structured content representation such as editor-generated JSON if appropriate. Store it alongside a normalized or searchable text representation, or derive that representation when saving.

Do not assume that an editor's serialized JSON is suitable for direct full-text search.

The `version` field should increment when a saved revision is committed, enabling concurrent-update detection.

### 6.3 Folder

Fields:

- `id`
- `ownerId`
- `name`
- `parentId`
- `createdAt`
- `updatedAt`

The initial release may implement a single-level folder hierarchy if that produces a more reliable product. If nested folders are supported, prevent cycles and enforce ownership across parent-child relationships.

### 6.4 Tag

Fields:

- `id`
- `ownerId`
- `name`
- `createdAt`

Use a many-to-many association through a `NoteTag` table.

Enforce appropriate uniqueness constraints so the same owner does not accidentally create multiple equivalent tags.

### 6.5 NoteTag

Fields:

- `noteId`
- `tagId`
- `createdAt`

Validate that the note and tag belong to the same owner unless the data model explicitly supports another authorized relationship.

### 6.6 NoteRevision

Fields:

- `id`
- `noteId`
- `version`
- `titleSnapshot`
- `contentSnapshot`
- `createdAt`
- `createdBy`

Use revision history to support conflict handling and practical recovery from accidental overwrites.

The initial release can retain a limited number of revisions or implement revisions only for meaningful saved changes. Define a retention policy instead of growing the revision table without control.

### 6.7 NoteShare

Fields:

- `id`
- `noteId`
- `tokenHash`
- `permission`
- `expiresAt`
- `revokedAt`
- `createdBy`
- `createdAt`

Possible permissions:

- `view`
- `comment`
- `edit`

Only implement permissions the backend actually enforces.

Store a hash of a securely generated share token rather than the usable token itself. The share URL should contain a cryptographically random secret with enough entropy to make guessing infeasible.

If a share is intended for private collaboration, it may optionally require an authenticated collaborator or an additional access factor. Do not expose private note content just because a token is present in an arbitrary request.

### 6.8 NoteComment

Fields:

- `id`
- `noteId`
- `shareId`
- `authorUserId`
- `guestDisplayName`
- `content`
- `createdAt`
- `updatedAt`
- `deletedAt`

The exact author fields depend on whether the commenter has an account.

Guest comments should not imply a verified identity. Clearly distinguish a guest-provided display name from an authenticated account identity.

### 6.9 Task

Fields:

- `id`
- `ownerId`
- `sourceNoteId`
- `sourceRevisionId`
- `title`
- `description`
- `status`
- `priority`
- `dueAt`
- `assigneeId`
- `createdAt`
- `updatedAt`
- `completedAt`

Initial statuses may include:

`todo`, `in_progress`, `done`

A task can be created manually or accepted from AI-generated action items.

Keep a reference to the originating note and, where feasible, the revision used for extraction so users can review the source context.

### 6.10 AIProcessingJob

Fields:

- `id`
- `noteId`
- `userId`
- `operation`
- `status`
- `sourceVersion`
- `modelIdentifier`
- `resultJson`
- `errorCode`
- `createdAt`
- `completedAt`

Example operation values:

- `generate_title`
- `summarize`
- `extract_actions`

Use background jobs only when needed for long-running processing, retries, or progress reporting. A short synchronous request is acceptable for the initial release when latency and request limits allow it.

Avoid storing entire prompts or full note content in operational records by default.

### 6.11 Data integrity

Implement:

- Foreign-key constraints
- Appropriate uniqueness constraints
- Indexes on owner IDs, folder IDs, note tags, statuses, and timestamps
- Query patterns that scope records to their authorized owner
- Consistent handling of soft-deleted notes
- Transactions for operations that need multiple database changes to succeed together
- Database migrations that can be replayed reliably

Deleting a note should follow an explicitly documented policy for revisions, shares, comments, AI jobs, and tasks derived from it.

Revoking a share should invalidate its access immediately for subsequent requests. It must not merely hide the link in the owner's interface.

## 7. Note Organization and Search

### 7.1 Organization features

Implement:

- Folders
- Tags
- Pinned notes
- Archive
- Recently updated notes
- Deleted notes or a trash-and-restore workflow, if included
- Search and filters
- Sorting by title, update time, and creation time

Avoid forcing all notes into a rigid category structure. Users should be able to write a note without first deciding exactly where it belongs.

### 7.2 Full-text search

Use PostgreSQL full-text search as the initial search engine.

Index note titles and textual note content. Where language-specific stemming is unsuitable, support an appropriate configuration or additional literal matching.

Search should support:

- Partial or phrase-oriented matching where practical
- Relevance-ranked results
- Matching excerpts
- Folder filters
- Tag filters
- Archived-state filters
- Date or recency sorting

Do not assume that a basic SQL `LIKE` query is equivalent to relevance-ranked full-text search.

Use debounced search requests, bounded result counts, and pagination to control database load.

### 7.3 Permission-aware indexing

Search results must be scoped to the authenticated owner or to the specific authorized sharing context.

A matching title must not leak through search results if the caller cannot read the note itself.

Ensure that deleted content, revoked shares, and inaccessible workspaces or resources cannot be retrieved through an alternative search or autocomplete endpoint.

### 7.4 Future semantic search

Semantic search may be added later to answer queries such as:

- “Find my notes about database transactions.”
- “Where did I document the authentication bug?”
- “Show notes related to my Web3 roadmap.”

If introduced, embeddings must respect the same ownership and authorization rules as ordinary search.

Do not send all notes to an AI provider for every search request. Retrieve a limited set of authorized candidates first and process only what the feature needs.

## 8. AI-Assisted Note Processing

The AI layer should perform three main operations: title generation, summarization, and action-item extraction.

AI output must be treated as a suggestion requiring validation and, for changes to user data, explicit approval.

### 8.1 Title generation

Given a note's title and content, generate a clear, concise title that reflects its central subject.

Requirements:

- Preserve the underlying meaning.
- Avoid generic titles such as “Untitled Document” unless the content genuinely lacks useful context.
- Avoid unsupported assumptions or invented entities.
- Apply a configurable length limit.
- Return a structured result.
- Allow regeneration.
- Preserve the existing title until the user accepts the suggestion.

The UI should provide explicit actions such as **Suggest title** and **Use suggestion**.

Never silently replace an established title when the user runs a summary or action-extraction operation.

### 8.2 Summarization

Generate a concise summary that helps a user understand a long note without reading every paragraph.

The summary should:

- Preserve important facts, decisions, key arguments, and conclusions.
- Highlight uncertainty or missing information where appropriate.
- Distinguish statements in the source from interpretations introduced by the model.
- Avoid adding facts that are absent from the note.
- Adapt to a reasonable target length.
- Remain traceable to the source note.

For sufficiently long content, use a documented chunking or hierarchical summarization strategy if necessary. Do not simply truncate arbitrary text in a way that systematically removes important conclusions near the end.

Store generated summaries with their source note version. A summary created from revision 4 should not automatically be treated as current after revision 5 changes the note substantially.

The user must be able to regenerate or dismiss the summary.

