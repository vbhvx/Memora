import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword, signSessionToken, verifySessionToken } from '@/server/auth/session';
import crypto from 'crypto';

describe('Integration: Authentication & Session Token Handling', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const password = 'Password123!';

  it('hashes password securely and verifies match', async () => {
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    const valid = await comparePassword(password, hash);
    expect(valid).toBe(true);
    const invalid = await comparePassword('WrongPassword', hash);
    expect(invalid).toBe(false);
  });

  it('creates user in database and signs verified session token', async () => {
    const userId = `usr_${crypto.randomUUID()}`;
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: testEmail,
        name: 'Test Engineer',
        passwordHash,
      })
      .returning();

    expect(user.id).toBe(userId);
    expect(user.email).toBe(testEmail);

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    expect(token).toBeDefined();

    const decoded = await verifySessionToken(token);
    expect(decoded?.id).toBe(user.id);
    expect(decoded?.email).toBe(testEmail);
  });

  it('rejects tampered or malformed session tokens', async () => {
    const fakeToken = 'invalid.jwt.token';
    const decoded = await verifySessionToken(fakeToken);
    expect(decoded).toBeNull();
  });
});

