import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = await NoteService.batchUpdateNotes(user.id, {
      noteIds: body.noteIds,
      action: body.action,
      folderId: body.folderId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
