import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/guard';
import { formatErrorResponse } from '@/server/errors/api-error';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
