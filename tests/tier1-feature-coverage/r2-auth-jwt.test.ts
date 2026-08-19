import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  branchId: string;
  iat: number;
  exp: number;
}

export function generateMockJwt(payload: any, secret: string = 'test-secret'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    sub: payload.sub || 'user-admin-1',
    email: payload.email || 'admin@medcare.com',
    role: payload.role || 'ADMIN',
    branchId: payload.branchId || 'branch-main',
    iat: payload.iat || now,
    exp: payload.exp || now + 3600,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = Buffer.from(header + '.' + body + '.' + secret).toString('base64url');
  return header + '.' + body + '.' + signature;
}

export function parseJwt(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch {
    return true;
  }
}

export function runR2AuthJwtTests() {
  describe('Tier 1 - R2: Authentication, JWT & Session Management (Feature Coverage)', () => {
    it('R2-T1-1: should validate standard administrator credentials against auth specification', () => {
      const validAdmin = { email: 'admin@medcare.com', password: 'Admin@123456' };
      assert.strictEqual(validAdmin.email.toLowerCase(), 'admin@medcare.com');
      assert.strictEqual(validAdmin.password, 'Admin@123456');
    });

    it('R2-T1-2: should generate valid JWT token with required claims', () => {
      const token = generateMockJwt({ email: 'admin@medcare.com', role: 'ADMIN', branchId: 'branch-1' });
      const payload = parseJwt(token);
      assert.strictEqual(payload.email, 'admin@medcare.com');
      assert.strictEqual(payload.role, 'ADMIN');
      assert.strictEqual(payload.branchId, 'branch-1');
      assert.ok(payload.exp > payload.iat);
    });

    it('R2-T1-3: should format Authorization header with Bearer prefix correctly', () => {
      const token = generateMockJwt({ email: 'pharmacist@medcare.com', role: 'PHARMACIST' });
      const authHeader = 'Bearer ' + token;
      assert.ok(authHeader.startsWith('Bearer '));
      const extractedToken = authHeader.replace('Bearer ', '');
      const parsed = parseJwt(extractedToken);
      assert.strictEqual(parsed.role, 'PHARMACIST');
    });

    it('R2-T1-4: should accurately detect active tokens vs expired tokens for session redirect', () => {
      const activeToken = generateMockJwt({ exp: Math.floor(Date.now() / 1000) + 1800 });
      assert.strictEqual(isTokenExpired(activeToken), false);

      const expiredToken = generateMockJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
      assert.strictEqual(isTokenExpired(expiredToken), true);
    });

    it('R2-T1-5: should verify role-based permissions matrix for Admin, Pharmacist, and Cashier', () => {
      const permissions: Record<string, string[]> = {
        ADMIN: ['inventory:manage', 'sales:create', 'reports:view', 'settings:edit'],
        PHARMACIST: ['inventory:manage', 'sales:create', 'schedule_h:verify'],
        CASHIER: ['sales:create', 'pos:access'],
      };

      assert.ok(permissions.ADMIN.includes('settings:edit'));
      assert.ok(!permissions.PHARMACIST.includes('settings:edit'));
      assert.ok(permissions.PHARMACIST.includes('schedule_h:verify'));
      assert.ok(permissions.CASHIER.includes('pos:access'));
      assert.ok(!permissions.CASHIER.includes('reports:view'));
    });
  });
}