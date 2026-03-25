import { NextRequest, NextResponse } from 'next/server'

const CONTROL_URL = process.env.NEXT_PUBLIC_CONTROL_URL || "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward to Flux Control Plane
    const res = await fetch(`${CONTROL_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[waitlist-bridge] error:', err);
    return NextResponse.json({ error: 'Failed to process waitlist request' }, { status: 500 });
  }
}
