import { NextResponse } from 'next/server';
import { askDataGouvAI, ChartConfig } from '@/lib/ai';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or empty question' }, { status: 400 });
    }

    if (question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 characters)' }, { status: 400 });
    }

    const progressMessages: string[] = [];
    const config: ChartConfig | null = await askDataGouvAI(
      question.trim(),
      (msg) => progressMessages.push(msg)
    );

    return NextResponse.json({ config, progressMessages });
  } catch (error: unknown) {
    logger.error('[chat] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
