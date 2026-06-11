import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_HOSTS = [
  'www.data.gouv.fr',
  'static.data.gouv.fr',
  'object.files.data.gouv.fr',
  'open.urssaf.fr',
  'files.data.gouv.fr',
  'data.education.gouv.fr',
];

// Simple in-memory rate limiter: max 30 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function GET(request: NextRequest) {
  // Rate limiting - use request.ip which is provided by Next.js and more secure than manually parsing x-forwarded-for
  const ip = request.ip || '127.0.0.1';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host))) {
    return NextResponse.json(
      { error: `Host not allowed: ${parsedUrl.hostname}. Only data.gouv.fr domains are permitted.` },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000), // 30s timeout
      headers: { 'User-Agent': 'DataGouv-Explorer/1.0' },
    });

    if (!res.ok) {
      throw new Error(`Upstream error: ${res.status} ${res.statusText}`);
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'text/plain',
        'Content-Length': res.headers.get('Content-Length') || '',
        'Cache-Control': 'public, max-age=300', // Cache 5 minutes
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch resource';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
