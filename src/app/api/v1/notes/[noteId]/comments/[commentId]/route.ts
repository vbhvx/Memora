import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { ShareService } from '@/server/services/share-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { noteId: string; commentId: string } }
) {
  try {
    const user = await requireAuth(req);
    const result = await ShareService.deleteComment(user.id, params.noteId, params.commentId);
    return NextResponse.json(result);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
