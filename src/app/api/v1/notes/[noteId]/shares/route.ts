import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { createShareSchema } from '@/server/validation/schemas';
import { ShareService } from '@/server/services/share-service';

export async function GET(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const shares = await ShareService.listSharesForNote(user.id, params.noteId);
    return NextResponse.json({ shares });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = createShareSchema.parse(body);

    const share = await ShareService.createShare(user.id, params.noteId, data);
    return NextResponse.json({ share }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

