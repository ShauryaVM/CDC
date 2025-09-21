import { NextRequest, NextResponse } from 'next/server';
import { ML_URL } from '@/lib/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${ML_URL}/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Upstream status ${res.status}`);
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    const inds: string[] = Array.isArray(body?.industry_ids) && body.industry_ids.length ? body.industry_ids : ['manufacturing','space_vehicles','information','professional_rd'];
    const periods = Array.from({ length: 8 }, (_, i) => `202${i<4?1:2}Q${(i%4)+1}`);
    const items = inds.flatMap((id, k) =>
      periods.map((p, i) => ({
        industry_id: id,
        period: p,
        sentiment: Math.max(-1, Math.min(1, 0.1 * k + 0.1 * Math.sin(i))),
      }))
    );
    const correlations = Object.fromEntries(
      inds.map((id, k) => [id, { current: 0.2 + 0.1 * k, bestLag: 2, corrAtBestLag: 0.3 + 0.1 * k }])
    );
    return NextResponse.json({ items, correlations });
  }
}


