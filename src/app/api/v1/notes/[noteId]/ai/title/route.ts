import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse, ApiError } from '@/server/errors/api-error';
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

    const result = await provider.generateTitle(content, note.title);

    // Save record of AI job
    await db.insert(aiProcessingJobs).values({
      id: `ai_${crypto.randomUUID()}`,
      noteId: note.id,
      userId: user.id,
      operation: 'generate_title',
      status: 'completed',
      sourceVersion: note.version,
      modelIdentifier: provider.name,
      resultJson: JSON.stringify(result),
      completedAt: new Date(),
    });

    return NextResponse.json({
      suggestion: result,
      sourceVersion: note.version,
      currentTitle: note.title,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

