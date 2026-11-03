import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { updateFolderSchema } from '@/server/validation/schemas';
import { OrganizationService } from '@/server/services/organization-service';

export async function PATCH(req: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = updateFolderSchema.parse(body);

    const folder = await OrganizationService.updateFolder(user.id, params.folderId, data.name, data.parentId);
    return NextResponse.json({ folder });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    const user = await requireAuth(req);
    const res = await OrganizationService.deleteFolder(user.id, params.folderId);
    return NextResponse.json(res);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

