import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';

export async function GET(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const revisions = await NoteService.getRevisions(user.id, params.noteId);
    return NextResponse.json({ revisions });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

