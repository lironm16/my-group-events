// Deprecated: username is no longer used. Keep route for backward compatibility.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ available: true });
}

