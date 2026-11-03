# Memora — AI-Powered Notes, Knowledge Organization & Action Management

> Capture information once, find it when you need it, understand it quickly, and turn it into action. AI assists, and you stay in control.

**Status: specification stage.** This repository currently holds the technical specification ([`Memora.md`](./Memora.md)). No application code has been written yet. Everything below describes the planned system.

---

## Overview

Most note apps separate capturing information from doing something useful with it. You collect meeting notes, study material and research, then have to organize, title, summarize and extract tasks by hand.

Memora aims to cut that friction with fast capture, conventional organization and search, explicit AI actions, and lightweight sharing. It is not a plain text editor, and it is not an autonomous AI agent. AI proposes, and the user reviews and approves.

**Target users:** students, developers, professionals, creators and small teams.

## Planned features

| Area | What it does |
|---|---|
| Note capture | Create, edit and delete notes; rich text with headings, lists, links and code blocks |
| Quick capture | Start writing immediately; new notes land in an Inbox with no required classification |
| Autosave | Debounced saves with a clear state: `Saving`, `Saved`, `Offline`, `Save failed`, `Conflict detected` |
| Organization | Folders, tags, pinning and archiving |
| Search | PostgreSQL full-text search over titles and content, with excerpts, filters and ranking |
| AI assistance | Suggested titles, summaries, and action items with assignees and deadlines |
| Tasks | Approved action items become editable tasks linked back to their source note |
| Sharing | Share links with view, comment or edit permission, expiry and instant revocation, no recipient account needed |
| Reliability | Handling for failed saves, edit conflicts, expired links, AI failures and network drops |

### Screens

Dashboard · Notes workspace · Search · Tasks · Shared note view · Settings

## Principles

- **AI is optional.** Reading and editing saved notes never depends on an AI service.
- **AI never acts silently.** Results are suggestions tied to the note version they came from. The user reviews and approves them before anything changes.
- **No per-keystroke AI.** AI runs from explicit actions or user-controlled settings.
- **Private by default.** AI processing never makes a note public or shared.
- **No lost edits.** Updates carry a note version. Stale writes are rejected with a conflict response, and the editor's unsaved content is preserved.

## Architecture

```text
Browser
  │
  ▼
Frontend + rich-text editor
  │
  ▼
Authenticated API / Guest share API
  │
  ▼
Authentication & access control
  │
  ▼
Input validation
  │
  ▼
Application services
  ├──────────────────────┐
  ▼                      ▼
PostgreSQL            AI service adapter
(notes, tasks,        (titles, summaries,
shares, revisions)     action items)
```

### Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Editor | Tiptap (or another maintained editor) |
| Backend | Next.js route handlers or a dedicated Node.js API |
| Database | PostgreSQL with Drizzle ORM or Prisma (one will be chosen) |
| Validation | Zod |
| Search | PostgreSQL full-text search (no separate search or vector store until needed) |
| AI | Provider-agnostic, server-side adapter with configurable provider and model |
| API docs | OpenAPI 3.x |
| Testing | Vitest or Jest, Playwright |

## Sharing and guest access

Recipients can open a note without creating an account, but that must not turn private notes into public ones.

- Tokens are cryptographically random, and only a **hash** of the token is stored.
- Expiry and revocation are checked on **every** request.
- A guest link grants access to one note only, never the owner's other notes, folders, tags, tasks or settings.
- Tokens are kept out of logs, analytics and error messages. Shared pages send a restrictive `Referrer-Policy` and `noindex`, though `noindex` is not treated as access control.
- The first release prioritizes **view-only** guest sharing. Comment and edit permissions come only once abuse protection and conflict handling are ready.

## API (planned)

Versioned under `/api/v1`, with authentication and authorization enforced on the server.

| Resource | Endpoints |
|---|---|
| Notes | `GET/POST /notes`, `GET/PATCH/DELETE /notes/:noteId` |
| Folders | `GET/POST /folders`, `PATCH/DELETE /folders/:folderId` |

Tags, search, AI actions, tasks and shares are specified in [`Memora.md`](./Memora.md), section 10.

## Planned repository layout

```text
src/
  app/          dashboard, notes, search, tasks, shared, settings, api/v1
  components/
  features/     notes, editor, search, organization, ai-assistance, tasks, sharing
  server/       auth, authorization, services, repositories, validation, ai, errors
  db/           schema, migrations, client
  lib/
tests/          unit, integration, security, e2e
docs/           architecture, api, ai-processing, sharing-security, openapi.yaml
```

## Roadmap

| Phase | Goal | Done when |
|---|---|---|
| 1 | Foundation and core notes | Notes can be created, edited, saved, reloaded and deleted with no AI |
| 2 | Organization and search | Users retrieve their own notes; search never leaks another user's content |
| 3 | AI assistance | AI creates reviewable suggestions without modifying notes silently |
| 4 | Task management | A note becomes tasks, each traceable to its source |
| 5 | Sharing and guest access | One note is shared with a no-account recipient without exposing anything else |
| 6 | Hardening | Conflict recovery, accessibility, and security and e2e tests pass |
| 7 | Release preparation | Another developer can set up, run and test it from the docs alone |

## Security and privacy

- The browser never receives the AI provider's API key.
- Every request is authorized on the server before private content is returned, and search respects the user's access scope.
- Sensitive note content is kept out of application logs.
- Rate limits, input validation and health checks are part of release readiness.

## Documentation

The full specification covers the data model, AI processing, API design, security requirements, testing strategy, acceptance criteria and risks. It is in [`Memora.md`](./Memora.md).

## License

Not yet chosen.
