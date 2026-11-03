import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { noteTagsSchema } from '@/server/validation/schemas';
import { OrganizationService } from '@/server/services/organization-service';

export async function PUT(req: NextRequest, { params }: { params: { noteId: string } }) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = noteTagsSchema.parse(body);

    const tagIds = await OrganizationService.setNoteTags(user.id, params.noteId, data.tagIds);
    return NextResponse.json({ tagIds });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

