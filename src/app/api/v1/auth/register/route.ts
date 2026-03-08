import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { registerSchema } from '@/server/validation/schemas';
import { hashPassword, signSessionToken, SESSION_COOKIE_NAME } from '@/server/auth/session';
import { ApiError, formatErrorResponse } from '@/server/errors/api-error';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const email = data.email.toLowerCase().trim();
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      throw ApiError.badRequest('An account with this email already exists.', [
        { field: 'email', code: 'EMAIL_ALREADY_EXISTS', message: 'Email already registered' },
      ]);
    }

    const userId = `usr_${crypto.randomUUID()}`;
    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name: data.name.trim(),
        passwordHash,
      })
      .returning();

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    return formatErrorResponse(err);
  }
}

