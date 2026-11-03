import { NextRequest, NextResponse } from 'next/server';
import { formatErrorResponse } from '@/server/errors/api-error';
import { guestEditNoteSchema } from '@/server/validation/schemas';
import { ShareService } from '@/server/services/share-service';

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const data = guestEditNoteSchema.parse(body);

    const updated = await ShareService.guestEditNote(params.token, data);
    return NextResponse.json({ note: updated });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

