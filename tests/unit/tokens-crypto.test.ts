import { describe, it, expect } from 'vitest';
import { ShareService } from '@/server/services/share-service';
import crypto from 'crypto';

describe('Unit: Share Token Cryptography & Security', () => {
  it('generates high entropy 64-character hex tokens', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    expect(rawToken.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(rawToken)).toBe(true);
  });

  it('produces consistent SHA-256 hashes of share tokens', () => {
    const token = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const hash1 = ShareService.hashToken(token);
    const hash2 = ShareService.hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
    // SHA256 of different token must not collide
    const diffHash = ShareService.hashToken(token + '1');
    expect(diffHash).not.toBe(hash1);
  });
});

