import { NextResponse } from 'next/server';
import { authOptions } from '@/auth';

export async function GET() {
  try {
    // Surface key config bits to verify deployment picked up JWT strategy
    return NextResponse.json({
      sessionStrategy: (authOptions as any)?.session?.strategy || 'unknown',
      providers: (authOptions as any)?.providers?.map((p: any) => p.id) || [],
      hasAdapter: !!(authOptions as any)?.adapter,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

