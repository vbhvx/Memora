import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';
import { getAiProvider } from '@/server/ai/provider';
import { db } from '@/db/client';
import { aiProcessingJobs } from '@/db/schema';
import crypto from 'crypto';

export async function POST(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const note = await NoteService.getNoteById(user.id, params.noteId);

    const provider = getAiProvider();
    const content = note.plainText || note.content;

    const result = await provider.generateSummary(content, note.version);

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

