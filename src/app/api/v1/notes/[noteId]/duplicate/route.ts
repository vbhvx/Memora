import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { NoteService } from '@/server/services/note-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const note = await NoteService.duplicateNote(user.id, params.noteId, {
      newTitle: body.newTitle,
      copyTags: body.copyTags,
      targetFolderId: body.targetFolderId,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
