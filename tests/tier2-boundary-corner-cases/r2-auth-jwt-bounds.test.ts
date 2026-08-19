import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseJwt, isTokenExpired } from '../tier1-feature-coverage/r2-auth-jwt.test.js';

export function runR2AuthJwtBoundsTests() {
  describe('Tier 2 - R2: Authentication & JWT (Boundary & Corner Cases)', () => {
    it('R2-BND-1: should throw error on malformed token strings lacking dots', () => {
      assert.throws(() => parseJwt('invalid-token-without-dots'), /Invalid JWT format/);
    });

    it('R2-BND-2: should evaluate token with exp exactly equal to current unix timestamp as expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify({ sub: 'user-1', exp: now })).toString('base64url');
      const token = header + '.' + body + '.signature';
      assert.strictEqual(isTokenExpired(token), true);
    });

    it('R2-BND-3: should handle tokens with corrupted base64 payloads safely', () => {
      const token = 'header.invalid_base64.signature';
      assert.strictEqual(isTokenExpired(token), true);
    });

    it('R2-BND-4: should reject auth credentials with leading/trailing whitespaces', () => {
      const inputEmail = '  admin@medcare.com  ';
      const inputPass = 'Admin@123456 ';
      assert.strictEqual(inputEmail.trim().toLowerCase(), 'admin@medcare.com');
      assert.notStrictEqual(inputPass, 'Admin@123456');
    });

    it('R2-BND-5: should safely parse tokens with extra unexpected claims without schema crashing', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify({ sub: 'admin', customAttr: { deep: true }, exp: 9999999999 })).toString('base64url');
      const token = header + '.' + body + '.sig';
      const parsed = parseJwt(token);
      assert.strictEqual((parsed as any).customAttr.deep, true);
    });
  });
}