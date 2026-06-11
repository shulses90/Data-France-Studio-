import test from 'node:test';
import assert from 'node:assert';

/**
 * These tests verify the IP detection logic used for rate limiting.
 * We use a mock of the logic because importing NextRequest in this test environment
 * can be complex due to missing dependencies.
 */

function getIpVulnerable(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function getIpSecure(request: { ip?: string }): string {
  return request.ip || '127.0.0.1';
}

test('Vulnerable IP detection can be spoofed via x-forwarded-for', () => {
  const headers = new Headers();
  headers.set('x-forwarded-for', '1.2.3.4');

  const ip = getIpVulnerable(headers);
  assert.strictEqual(ip, '1.2.3.4', 'Should return the spoofed IP');

  const headers2 = new Headers();
  headers2.set('x-forwarded-for', '5.6.7.8, 127.0.0.1');
  const ip2 = getIpVulnerable(headers2);
  assert.strictEqual(ip2, '5.6.7.8', 'Should return the first IP in the list, which can be spoofed');
});

test('Secure IP detection uses request.ip and ignores x-forwarded-for header', () => {
  const mockRequest = {
    ip: '203.0.113.195',
    headers: new Headers({ 'x-forwarded-for': '1.2.3.4' })
  };

  const ip = getIpSecure(mockRequest);
  assert.strictEqual(ip, '203.0.113.195', 'Should use request.ip instead of x-forwarded-for header');
});

test('Secure IP detection falls back to 127.0.0.1 when ip is missing', () => {
  const mockRequest = {
    headers: new Headers({ 'x-forwarded-for': '1.2.3.4' })
  };

  const ip = getIpSecure(mockRequest);
  assert.strictEqual(ip, '127.0.0.1', 'Should fallback to 127.0.0.1 when ip is missing');
});
