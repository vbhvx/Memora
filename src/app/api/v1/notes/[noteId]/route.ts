import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { updateNoteSchema } from '@/server/validation/schemas';
import { NoteService } from '@/server/services/note-service';

export async function GET(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const note = await NoteService.getNoteById(user.id, params.noteId);
    return NextResponse.json({ note });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = updateNoteSchema.parse(body);

    const updated = await NoteService.updateNote(user.id, params.noteId, data);
    return NextResponse.json({ note: updated });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const res = await NoteService.deleteNote(user.id, params.noteId);
    return NextResponse.json(res);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

