# Memora AI Processing & Privacy Specification

Memora treats AI as an assistive capability designed to accelerate knowledge capture and action conversion, rather than an autonomous agent that mutates data without consent.

---

## 1. Supported Operations & Structured Schemas

### 1.1 Title Generation (`/api/v1/notes/:noteId/ai/title`)
Analyzes note content and suggests a concise, high-signal title (maximum 60 characters).

**Output Schema:**
```typescript
interface AiTitleResponse {
  title: string;
  explanation?: string;
}
```

### 1.2 Summarization (`/api/v1/notes/:noteId/ai/summary`)
Generates an executive overview and extracts up to 4 key takeaways, tied to the exact note version processed.

**Output Schema:**
```typescript
interface AiSummaryResponse {
  summary: string;
  keyPoints: string[];
  sourceVersion: number;
}
```

### 1.3 Action-Item Extraction (`/api/v1/notes/:noteId/ai/actions`)
Identifies commitments, pending actions, assignees, and deadlines mentioned in the note text.

**Output Schema:**
```typescript
interface AiActionItem {
  title: string;
  description: string | null;
  assigneeName: string | null;
  dueDateText: string | null;
  confidence: number;
  sourceExcerpt: string;
}

interface AiActionsResponse {
  items: AiActionItem[];
}
```

---

## 2. Source Versioning & Stale Detection

Every AI request records the note's active `version` at time of execution (`sourceVersion`). If the note is edited before the AI response is received or approved, the UI explicitly warns the user that the suggestion is tied to an earlier revision.

---

## 3. Review & Approval Model

AI outputs are presented in reviewable cards in the editor:
- **Title Suggestions:** User can review the proposed title and click **Apply Title** or **Dismiss**.
- **Summaries:** Displayed in a dedicated card with a **Copy** action.
- **Action Items:** Displayed in an interactive review list with checkboxes. Only approved items are submitted to `/api/v1/tasks/from-suggestions`.

---

## 4. Provider-Agnostic Adapter & Zero-Key Fallback

Memora features a provider-agnostic adapter (`src/server/ai/provider.ts`):
- **Mock Provider (Default):** Runs an intelligent heuristic NLP parser. It requires zero API keys, guarantees zero downtime during tests and offline work, and deterministically extracts titles, summaries, and action items with assignees and deadlines.
- **Gemini Provider:** Activates when `AI_PROVIDER=gemini` and `AI_API_KEY` is present.
- **OpenAI Provider:** Activates when `AI_PROVIDER=openai` and `AI_API_KEY` is present.

---

## 5. Security & Privacy Disclosures

- All AI requests originate from the backend server; API keys are never leaked to client browsers.
- AI requests are initiated strictly by explicit user actions.
- Prompts, raw text, and secret keys are never emitted into unredacted application logs.
- AI processing never alters note privacy or sharing permissions.

