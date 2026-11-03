import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { createNoteSchema } from '@/server/validation/schemas';
import { NoteService } from '@/server/services/note-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const folderId = searchParams.get('folderId');
    const tagId = searchParams.get('tagId') || undefined;
    const isPinnedParam = searchParams.get('pinned');
    const isArchivedParam = searchParams.get('archived');
    const sortParam = (searchParams.get('sort') || 'updated') as 'updated' | 'created' | 'title';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const notesList = await NoteService.listNotes(user.id, {
      folderId: folderId !== null ? folderId : undefined,
      tagId,
      isPinned: isPinnedParam !== null ? isPinnedParam === 'true' : undefined,
      isArchived: isArchivedParam !== null ? isArchivedParam === 'true' : undefined,
      sort: sortParam,
      limit,
    });

    return NextResponse.json({ notes: notesList });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = createNoteSchema.parse(body);

    const created = await NoteService.createNote(user.id, data);
    return NextResponse.json({ note: created }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
