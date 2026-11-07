# Memora API Reference

All application endpoints are served under `/api/v1`. Authentication is supported via HTTP-only session cookies (`memora_session`) or `Authorization: Bearer <token>` headers.

---

## 1. Standard Error Format

All error responses conform to the following schema:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "code": "TOO_SHORT",
        "message": "Title must be at least 1 character."
      }
    ],
    "requestId": "req_8e29a1b0c43d7890"
  }
}
```

### Standard Error Codes

| Status Code | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Schema validation failed on path, query, or body |
| 401 | `UNAUTHORIZED` | Authentication required or session token invalid |
| 403 | `FORBIDDEN` / `REVOKED` | Resource access forbidden or share revoked |
| 404 | `NOT_FOUND` | Resource not found or tenant-isolated |
| 409 | `CONFLICT` | Optimistic concurrency conflict (version mismatch) |
| 410 | `EXPIRED` | Share link expired |
| 429 | `RATE_LIMIT_EXCEEDED` | Request rate limit exceeded |
| 502 | `AI_SERVICE_ERROR` | External AI provider error |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected internal exception |

---

## 2. Key Endpoint Groups

### Authentication
- `POST /api/v1/auth/register` — Register a new account
- `POST /api/v1/auth/login` — Sign in and receive session cookie
- `POST /api/v1/auth/logout` — Revoke session cookie
- `GET /api/v1/auth/me` — Retrieve profile of authenticated user

### Notes Management
- `GET /api/v1/notes` — List notes with filters (`folderId`, `tagId`, `pinned`, `archived`, `isTrash`)
- `POST /api/v1/notes` — Create note and initial revision snapshot (v1)
- `GET /api/v1/notes/:noteId` — Retrieve note by ID
- `PATCH /api/v1/notes/:noteId` — Update note with optimistic concurrency control (`version`)
- `DELETE /api/v1/notes/:noteId` — Soft delete note (moves to trash)
- `DELETE /api/v1/notes/:noteId?hard=true` — Permanently purge note
- `POST /api/v1/notes/:noteId/restore` — Restore note from trash
- `GET /api/v1/notes/:noteId/revisions` — Retrieve revision history snapshots
- `POST /api/v1/notes/:noteId/revisions/:revisionId/rollback` — Roll back note state to a previous version
- `PUT /api/v1/notes/:noteId/tags` — Replace assigned tags

### Organization
- `GET /api/v1/folders` — List folders
- `POST /api/v1/folders` — Create folder (optional `parentId`)
- `PATCH /api/v1/folders/:folderId` — Update or rename folder
- `DELETE /api/v1/folders/:folderId` — Delete folder (notes moved to inbox)
- `GET /api/v1/tags` — List tags
- `POST /api/v1/tags` — Create tag (unique per owner)

### Search
- `GET /api/v1/search?q=...` — Relevance-ranked PostgreSQL FTS with snippets and filters

### AI Workflows
- `POST /api/v1/notes/:noteId/ai/title` — Suggest concise title
- `POST /api/v1/notes/:noteId/ai/summary` — Generate summary with configurable mode (`executive`, `bullets`, `action_plan`, `tldr`)
- `POST /api/v1/notes/:noteId/ai/actions` — Extract tasks with assignees and deadlines

### Tasks & Action Items
- `GET /api/v1/tasks` — List tasks with filters (`status`, `priority`)
- `POST /api/v1/tasks` — Create task manually
- `PATCH /api/v1/tasks/:taskId` — Update task status (`todo`, `in_progress`, `done`) or fields
- `DELETE /api/v1/tasks/:taskId` — Delete task
- `POST /api/v1/tasks/from-suggestions` — Convert approved suggestions into tasks with deduplication

### Sharing & Guest Access
- `POST /api/v1/notes/:noteId/shares` — Generate secure share link (`view`, `comment`, `edit`)
- `GET /api/v1/notes/:noteId/shares` — List active shares for owner with `viewCount` telemetry & `lastAccessedAt`
- `DELETE /api/v1/notes/:noteId/shares/:shareId` — Revoke share immediately
- `GET /api/v1/notes/:noteId/comments` — List guest comments on note for owner review
- `DELETE /api/v1/notes/:noteId/comments/:commentId` — Moderate/delete inappropriate guest comment
- `GET /api/v1/shared/:token` — Unauthenticated guest reading (increments telemetry `viewCount`)
- `POST /api/v1/shared/:token/comments` — Post guest comment (if permitted)
- `PATCH /api/v1/shared/:token/edit` — Guest editing with optimistic concurrency

