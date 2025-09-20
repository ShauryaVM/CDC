import { NextRequest, NextResponse } from 'next/server';
import { ML_URL } from '@/lib/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${ML_URL}/sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return NextResponse.json(json);
}


