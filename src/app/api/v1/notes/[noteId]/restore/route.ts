import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const restored = await NoteService.restoreNote(user.id, params.noteId);
    return NextResponse.json({ note: restored });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

