import { NextResponse } from 'next/server';

export async function GET() {
  const hasApiKey = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks: {
      gemini_api_key: hasApiKey ? 'configured' : 'missing',
    },
  }, {
    status: hasApiKey ? 200 : 503,
  });
}
