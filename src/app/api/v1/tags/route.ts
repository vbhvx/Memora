import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { createTagSchema } from '@/server/validation/schemas';
import { OrganizationService } from '@/server/services/organization-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const tagsList = await OrganizationService.listTags(user.id);
    return NextResponse.json({ tags: tagsList });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = createTagSchema.parse(body);

    const tag = await OrganizationService.createTag(user.id, data.name);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
