import { NextRequest, NextResponse } from 'next/server';
import { formatErrorResponse } from '@/server/errors/api-error';
import { createCommentSchema } from '@/server/validation/schemas';
import { ShareService } from '@/server/services/share-service';

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const data = createCommentSchema.parse(body);

    const comment = await ShareService.addGuestComment(
      params.token,
      data.guestDisplayName,
      data.content
    );

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

