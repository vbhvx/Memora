import { GoogleGenerativeAI } from '@google/generative-ai';
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
// Google Gemini Provider (Official @google/generative-ai SDK)
// -------------------------------------------------------------
export class GeminiAiProvider implements AiProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      if (!text) {
        throw new Error('Empty response received from Gemini.');
      }
      return text;
    } catch (err: any) {
      throw ApiError.aiError(`Gemini API error: ${err.message}`);
    }
  }

  async generateTitle(content: string, currentTitle?: string): Promise<AiTitleResponse> {
    const system =
      'You are an executive note titling assistant. Return a concise, informative title (under 60 characters) based on the note text. Return JSON matching: {"title": string, "explanation": string}.';
    const user = `Current title: ${currentTitle || 'Untitled'}\n\nNote Content:\n${content}`;
    const raw = await this.callGemini(system, user);
    const parsed = JSON.parse(raw);
    return aiTitleResponseSchema.parse(parsed);
  }

  async generateSummary(content: string, sourceVersion: number): Promise<AiSummaryResponse> {
    const system =
      'You are an executive summary assistant. Return a concise 2-3 sentence summary and 2-4 key takeaway bullet points. Return JSON matching: {"summary": string, "keyPoints": string[]}.';
    const raw = await this.callGemini(system, content);
    const parsed = JSON.parse(raw);
    return aiSummaryResponseSchema.parse({ ...parsed, sourceVersion });
  }

  async extractActions(content: string, sourceVersion: number): Promise<AiActionsResponse> {
    const system =
      'You are a task extraction assistant. Identify actionable commitments, deadlines, and assignees mentioned in the note text. Do not invent assignees or dates unless supported by the source text. Return JSON matching: {"items": [{"title": string, "description": string | null, "assigneeName": string | null, "dueDateText": string | null, "confidence": number, "sourceExcerpt": string}]}.';
    const raw = await this.callGemini(system, content);
    const parsed = JSON.parse(raw);
    return aiActionsResponseSchema.parse(parsed);
  }
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

  async extractActions(content: string, _sourceVersion: number): Promise<AiActionsResponse> {
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
        let assigneeName: string | null = null;
        const assigneeMatch = sentence.match(/(?:ask|assign(?:ed)? to|tell)\s+([A-Z][a-z]+)/i);
        if (assigneeMatch) {
          assigneeName = assigneeMatch[1];
        }

        let dueDateText: string | null = null;
        const dueMatch = sentence.match(/(?:by|before|on|due)\s+([A-Za-z0-9\s]+?)(?:[.,;]|$)/i);
        if (dueMatch) {
          const rawDue = dueMatch[0].trim();
          if (rawDue.length < 30) {
            dueDateText = rawDue;
          }
        }

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
// OpenAI Provider (Alternative fallback)
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

  async extractActions(content: string, _sourceVersion: number): Promise<AiActionsResponse> {
    const system = 'Extract actionable tasks. Return JSON: {"items": [{"title": "...", "description": null, "assigneeName": null, "dueDateText": null, "confidence": 0.9, "sourceExcerpt": "..."}]}';
    const raw = await this.callOpenAi(system, content);
    const parsed = JSON.parse(raw);
    return aiActionsResponseSchema.parse(parsed);
  }
}

// -------------------------------------------------------------
// Provider Factory (Prioritizes Google Gemini API)
// -------------------------------------------------------------
export function getAiProvider(): AiProvider {
  const geminiKey = process.env.GEMINI_API_KEY || (process.env.AI_PROVIDER === 'gemini' ? process.env.AI_API_KEY : undefined);
  const geminiModel = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-1.5-flash';

  if (geminiKey) {
    return new GeminiAiProvider(geminiKey, geminiModel);
  }

  const provider = (process.env.AI_PROVIDER || '').toLowerCase();
  const apiKey = process.env.AI_API_KEY;

  if (provider === 'openai' && apiKey) {
    return new OpenAiAiProvider(apiKey, process.env.AI_MODEL || 'gpt-4o-mini');
  }

  return new MockAiProvider();
}
