# Memora

Memora is a note and task workspace with rich-text notes, folders and tags, search, revisions, sharing/comments, task extraction, and optional AI assistance for titles, summaries, and actions. The API supports both Clerk-oriented pages and local auth routes; configuration determines which external services are used.

## Architecture

Next.js 14/React 18 provides the UI and API routes in `src/app/api/v1`. Tiptap powers editing; Drizzle and PostgreSQL/Neon persist notes and tasks; Zod validates requests; `jose` and `bcryptjs` support authentication. Domain/UI code lives in `src/components`, `src/context`, `src/lib`, and `src/server`; migrations are maintained through Drizzle tooling and `scripts/migrate.mjs`.

## Setup

```bash
cd 5_Memora
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Configure `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, and `APP_URL`. Clerk and Gemini variables are optional unless using those integrations; `AI_PROVIDER` selects the configured AI path.

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```
