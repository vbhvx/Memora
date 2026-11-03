import { NextRequest } from 'next/server';
import { getSessionUser, AuthUser } from './session';
import { ApiError } from '../errors/api-error';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  // 1. Try Clerk authentication if configured
  if (process.env.CLERK_SECRET_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    try {
      const clerkAuth = await auth();
      if (clerkAuth && clerkAuth.userId) {
        const userId = clerkAuth.userId;
        const existing = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (existing) {
          return {
            id: existing.id,
            email: existing.email,
            name: existing.name,
          };
        }

        // Auto-provision user record for Clerk user
        const clerkUser = await currentUser();
        const email =
          clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.user`;
        const name =
          [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
          clerkUser?.username ||
          'Clerk User';

        await db
          .insert(users)
          .values({
            id: userId,
            email,
            name,
            passwordHash: 'clerk_managed',
          })
          .onConflictDoNothing();

        return { id: userId, email, name };
      }
    } catch {
      // In case Clerk auth is not in a Clerk request context, continue to fallback
    }
  }

  // 2. Fall back to session cookie / Bearer token (used in tests and local mode)
  const sessionUser = await getSessionUser(req);
  if (sessionUser) {
    return sessionUser;
  }

  throw ApiError.unauthorized('You must be logged in to perform this action.');
}

export async function getOptionalUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}
