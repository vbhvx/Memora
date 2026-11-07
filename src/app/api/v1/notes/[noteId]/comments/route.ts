import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { ShareService } from '@/server/services/share-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const comments = await ShareService.listCommentsForNote(user.id, params.noteId);
    return NextResponse.json({ comments });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
