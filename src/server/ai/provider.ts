import {
  AiTitleResponse,
  AiSummaryResponse,
  AiActionsResponse,
  aiTitleResponseSchema,
  aiSummaryResponseSchema,
  aiActionsResponseSchema,
  AiActionItem,
} from './schemas';
import { ApiError } from '../errors/api-error';

export interface AiProvider {
  name: string;
  generateTitle(content: string, currentTitle?: string): Promise<AiTitleResponse>;
  generateSummary(content: string, sourceVersion: number): Promise<AiSummaryResponse>;
  extractActions(content: string, sourceVersion: number): Promise<AiActionsResponse>;
}

// -------------------------------------------------------------
// Intelligent Heuristic Mock Provider (Reliable, Zero-Key, Deterministic)
// -------------------------------------------------------------
export class MockAiProvider implements AiProvider {
  name = 'mock';

  async generateTitle(content: string, currentTitle?: string): Promise<AiTitleResponse> {
    const text = (content || '').trim();
    if (!text) {
      return {
        title: currentTitle && currentTitle !== 'Untitled' ? currentTitle : 'Quick Note',
        explanation: 'Default title for empty note',
      };
    }

    // Check for leading heading or first non-empty line
    const lines = text.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).filter(Boolean);
    const firstLine = lines[0] || 'Untitled Note';

    let suggested = firstLine;
    if (suggested.length > 60) {
      suggested = suggested.substring(0, 57).trim() + '...';
    }

    return aiTitleResponseSchema.parse({
      title: suggested,
      explanation: 'Derived from primary heading and opening subject',
    });
  }

  async generateSummary(content: string, sourceVersion: number): Promise<AiSummaryResponse> {
    const text = (content || '').trim();
    if (!text) {
      return {
        summary: 'This note is currently empty.',
        keyPoints: [],
        sourceVersion,
      };
    }

    const sentences = text
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const summaryText =
      sentences.length <= 2
        ? sentences.join(' ')
        : `${sentences[0]} ${sentences[1] || ''}`.trim();

    const keyPoints = sentences
      .filter((s) => /action|important|key|decision|plan|review|verify|status|launch|deadline|goal|priority/i.test(s))
      .slice(0, 4);

    return aiSummaryResponseSchema.parse({
      summary: summaryText || 'Concise overview of the note content.',
      keyPoints: keyPoints.length > 0 ? keyPoints : [sentences[0] || 'Key notes captured.'],
      sourceVersion,
    });
  }

  async extractActions(content: string, sourceVersion: number): Promise<AiActionsResponse> {
    const text = (content || '').trim();
    if (!text) {
      return { items: [] };
    }

    const sentences = text.split(/(?<=[.?!])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    const items: AiActionItem[] = [];

    const actionPattern = /\b(review|check|submit|ask|verify|create|implement|deploy|update|write|send|prepare|finish|schedule|fix|email|organize|test|build)\b/i;

    for (const sentence of sentences) {
      const match = sentence.match(actionPattern);
      if (match) {
        // Extract potential assignee
        let assigneeName: string | null = null;
        const assigneeMatch = sentence.match(/(?:ask|assign(?:ed)? to|tell)\s+([A-Z][a-z]+)/i);
        if (assigneeMatch) {
          assigneeName = assigneeMatch[1];
        }

        // Extract potential deadline text
        let dueDateText: string | null = null;
        const dueMatch = sentence.match(/(?:by|before|on|due)\s+([A-Za-z0-9\s]+?)(?:[.,;]|$)/i);
        if (dueMatch) {
          const rawDue = dueMatch[0].trim();
          if (rawDue.length < 30) {
            dueDateText = rawDue;
          }
        }

        // Clean action title
        let actionTitle = sentence;
        if (actionTitle.length > 80) {
          actionTitle = actionTitle.substring(0, 77).trim() + '...';
        }

        items.push({
          title: actionTitle,
          description: null,
          assigneeName,
          dueDateText,
          confidence: assigneeName || dueDateText ? 0.92 : 0.85,
          sourceExcerpt: sentence.length > 150 ? sentence.substring(0, 147) + '...' : sentence,
        });
      }
    }

    return aiActionsResponseSchema.parse({
      items: items.slice(0, 10),
    });
  }
}

// -------------------------------------------------------------
// Gemini Provider
// -------------------------------------------------------------
export class GeminiAiProvider implements AiProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nRespond with valid JSON only.\n\nInput:\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw ApiError.aiError(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw ApiError.aiError('Empty response received from Gemini.');
    }
    return rawText;
  }

  async generateTitle(content: string, currentTitle?: string): Promise<AiTitleResponse> {
    const system = 'You are a professional note titling assistant. Return a concise, high-signal title (max 60 chars) as JSON: {"title": "...", "explanation": "..."}.';
    const raw = await this.callGemini(system, `Current Title: ${currentTitle || 'Untitled'}\n\nContent:\n${content}`);
    const parsed = JSON.parse(raw);
    return aiTitleResponseSchema.parse(parsed);
  }

  async generateSummary(content: string, sourceVersion: number): Promise<AiSummaryResponse> {
    const system = 'You are an executive summary assistant. Return JSON: {"summary": "2-3 sentences", "keyPoints": ["bullet1", "bullet2"]}';
    const raw = await this.callGemini(system, content);
    const parsed = JSON.parse(raw);
    return aiSummaryResponseSchema.parse({ ...parsed, sourceVersion });
  }

  async extractActions(content: string, sourceVersion: number): Promise<AiActionsResponse> {
    const system = 'Extract actionable tasks from note content. Return JSON: {"items": [{"title": "...", "description": null, "assigneeName": null, "dueDateText": null, "confidence": 0.9, "sourceExcerpt": "..."}]}. Do not invent assignees or dates.';
    const raw = await this.callGemini(system, content);
    const parsed = JSON.parse(raw);
    return aiActionsResponseSchema.parse(parsed);
  }
}

// -------------------------------------------------------------
// OpenAI Provider
// -------------------------------------------------------------
export class OpenAiAiProvider implements AiProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async callOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: `${systemPrompt} Output valid JSON only.` },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw ApiError.aiError(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  async generateTitle(content: string, currentTitle?: string): Promise<AiTitleResponse> {
    const system = 'Return JSON: {"title": "...", "explanation": "..."}. Title should be under 60 characters.';
    const raw = await this.callOpenAi(system, `Current Title: ${currentTitle || ''}\n\nContent:\n${content}`);
    const parsed = JSON.parse(raw);
    return aiTitleResponseSchema.parse(parsed);
  }

  async generateSummary(content: string, sourceVersion: number): Promise<AiSummaryResponse> {
    const system = 'Return JSON: {"summary": "2-3 sentences", "keyPoints": ["bullet1", "bullet2"]}';
    const raw = await this.callOpenAi(system, content);
    const parsed = JSON.parse(raw);
    return aiSummaryResponseSchema.parse({ ...parsed, sourceVersion });
  }

  async extractActions(content: string, sourceVersion: number): Promise<AiActionsResponse> {
    const system = 'Extract actionable tasks. Return JSON: {"items": [{"title": "...", "description": null, "assigneeName": null, "dueDateText": null, "confidence": 0.9, "sourceExcerpt": "..."}]}';
    const raw = await this.callOpenAi(system, content);
    const parsed = JSON.parse(raw);
    return aiActionsResponseSchema.parse(parsed);
  }
}

// -------------------------------------------------------------
// Provider Factory
// -------------------------------------------------------------
export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (provider === 'gemini' && apiKey) {
    return new GeminiAiProvider(apiKey, model || 'gemini-1.5-flash');
  }

  if (provider === 'openai' && apiKey) {
    return new OpenAiAiProvider(apiKey, model || 'gpt-4o-mini');
  }

  return new MockAiProvider();
}

