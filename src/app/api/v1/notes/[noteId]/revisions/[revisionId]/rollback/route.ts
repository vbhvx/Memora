import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { noteId: string; revisionId: string } }
) {
  try {
    const user = await requireAuth(req);
    const updated = await NoteService.rollbackRevision(user.id, params.noteId, params.revisionId);
    return NextResponse.json({ note: updated });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

