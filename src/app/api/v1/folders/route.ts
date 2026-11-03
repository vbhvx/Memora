import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { createFolderSchema } from '@/server/validation/schemas';
import { OrganizationService } from '@/server/services/organization-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const foldersList = await OrganizationService.listFolders(user.id);
    return NextResponse.json({ folders: foldersList });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const data = createFolderSchema.parse(body);

    const folder = await OrganizationService.createFolder(user.id, data.name, data.parentId);
    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
