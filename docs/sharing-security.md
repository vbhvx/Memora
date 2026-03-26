# Memora Sharing & Guest Access Security Model

Memora allows note authors to share individual notes without forcing recipients to register for an account. However, reduced account friction does not compromise security boundaries.

---

## 1. Cryptographic Token Generation & Hashing

When a user creates a share link:
1. The server generates a 256-bit cryptographically random token:
   ```typescript
   const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex characters
   ```
2. The server computes the SHA-256 hash of this token:
   ```typescript
   const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
   ```
3. The server stores only `token_hash` in PostgreSQL (`note_shares` table).
4. The raw token is returned to the author once to construct the share URL (`/shared/<rawToken>`).
5. Neither the raw token nor plaintext secrets are stored in the database. A database dump or unauthorized query cannot yield usable guest links.

---

## 2. Permission Levels

Memora supports three explicit permission levels:

| Permission | Capabilities |
|---|---|
| `view` | Read-only rendering of the specific note. Rejects comment and edit requests. |
| `comment` | Read note and participate in comment discussions using an optional display name. |
| `edit` | Collaborative editing with version-checked optimistic concurrency control. |

---

## 3. Strict Scope & Tenant Isolation

A guest possessing a valid share link can access:
- **ONLY** the single note associated with that share (`title`, `content`, `plainText`, `version`, `updatedAt`).
- Comments posted to that note (if permission allows).

A guest link **NEVER** grants access to:
- The note owner's email, name, or account ID.
- The owner's folder hierarchy or taxonomy.
- The owner's tags, other notes, or dashboard data.
- The owner's private action tasks.
- Note-management endpoints (creating, renaming, deleting, or re-sharing notes).

---

## 4. Immediate Revocation & Expiration

- **Revocation:** When the owner clicks "Revoke", `revoked_at` is set to `NOW()`. Every subsequent guest request immediately returns `403 Forbidden` (`REVOKED`).
- **Expiration:** If `expires_at` is reached, all subsequent requests immediately return `410 Gone` (`EXPIRED`).
- **Cache-Control:** All shared note responses set `Cache-Control: no-store, no-cache, must-revalidate` to prevent private note content from persisting in intermediate or browser caches.

