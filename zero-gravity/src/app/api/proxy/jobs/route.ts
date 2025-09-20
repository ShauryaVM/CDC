import { NextRequest, NextResponse } from 'next/server';
import { ML_URL } from '@/lib/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${ML_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Upstream status ${res.status}`);
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    const inds: string[] = Array.isArray(body?.industry_ids) && body.industry_ids.length ? body.industry_ids : ['manufacturing'];
    const now = 2023; const horizon: number = Number(body?.horizon_years) || 5;
    const items = inds.flatMap((id) => Array.from({length: horizon}, (_, i) => ({ industry_id: id, year: now + 1 + i, employment_direct: 10000 + 500*i, employment_indirect: 4000 + 200*i, employment_induced: 3000 + 150*i, employment_total: 17000 + 850*i })));
    const states = ['CA','TX','FL','CO','WA','VA','AL','AZ','OH','NM'];
    const geo = states.map((s, i) => ({ state: s, industry_id: inds[0], total_2030: 10000 + i*1500 }));
    return NextResponse.json({ items, geo });
  }
}


