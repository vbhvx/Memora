import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';
import { getAiProvider } from '@/server/ai/provider';
import { summaryModeSchema, SummaryMode } from '@/server/ai/schemas';
import { db } from '@/db/client';
import { aiProcessingJobs } from '@/db/schema';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const note = await NoteService.getNoteById(user.id, params.noteId);

    let mode: SummaryMode = 'executive';
    try {
      const body = await req.json();
      if (body?.mode) {
        mode = summaryModeSchema.parse(body.mode);
      }
    } catch {
      // Body is empty or optional, default to executive
    }

    const provider = getAiProvider();
    const content = note.plainText || note.content;

    const result = await provider.generateSummary(content, note.version, mode);

    await db.insert(aiProcessingJobs).values({
      id: `ai_${crypto.randomUUID()}`,
      noteId: note.id,
      userId: user.id,
      operation: 'summarize',
      status: 'completed',
      sourceVersion: note.version,
      modelIdentifier: provider.name,
      resultJson: JSON.stringify(result),
      completedAt: new Date(),
    });

    return NextResponse.json({
      summary: result,
      sourceVersion: note.version,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

