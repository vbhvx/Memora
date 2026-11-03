import { NextRequest } from 'next/server';
import { getSessionUser, AuthUser } from './session';
import { ApiError } from '../errors/api-error';

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await getSessionUser(req);
  if (!user) {
    throw ApiError.unauthorized('You must be logged in to perform this action.');
  }
  return user;
}

export async function getOptionalUser(req: NextRequest): Promise<AuthUser | null> {
  return getSessionUser(req);
}

