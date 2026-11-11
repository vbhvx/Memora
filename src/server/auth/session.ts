import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const DEV_FALLBACK_SECRET = 'memora-development-jwt-secret-minimum-32-chars-long';

// The fallback only applies outside production (local dev and tests).
function getSigningSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = 'memora_session';
export const SESSION_EXPIRY = '7d';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getSigningSecret());
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningSecret());
    if (!payload.id || !payload.email || !payload.name) {
      return null;
    }
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<AuthUser | null> {
  // Check Authorization header first (e.g. Bearer <token>)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const user = await verifySessionToken(token);
    if (user) return user;
  }

  // Check HTTP-only cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie && cookie.value) {
    const user = await verifySessionToken(cookie.value);
    if (user) return user;
  }

  return null;
}

