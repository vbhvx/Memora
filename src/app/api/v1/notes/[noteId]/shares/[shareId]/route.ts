import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { updateShareSchema } from '@/server/validation/schemas';
import { ShareService } from '@/server/services/share-service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { noteId: string; shareId: string } }
) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = updateShareSchema.parse(body);

    const updated = await ShareService.updateShare(user.id, params.noteId, params.shareId, data);
    return NextResponse.json({ share: updated });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { noteId: string; shareId: string } }
) {
  try {
    const user = await requireAuth(req);
    const res = await ShareService.revokeShare(user.id, params.noteId, params.shareId);
    return NextResponse.json(res);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

