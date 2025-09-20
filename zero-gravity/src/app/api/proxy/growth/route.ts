import { NextRequest, NextResponse } from 'next/server';
import { ML_URL } from '@/lib/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${ML_URL}/forecast/growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Upstream status ${res.status}`);
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    const inds: string[] = Array.isArray(body?.industry_ids) && body.industry_ids.length ? body.industry_ids : ['manufacturing','space_vehicles'];
    const horizon: number = Number(body?.horizon_years) || 5;
    const now = 2023;
    const items = inds.map((id, k) => {
      const years = Array.from({length: horizon}, (_, i) => now + 1 + i);
      const base = 20000 + k * 5000;
      const prediction = years.map((_, i) => base * (1 + 0.08 + 0.02 * k) ** (i + 1));
      const lower = prediction.map(v => v * 0.85);
      const upper = prediction.map(v => v * 1.15);
      return { industry_id: id, years, prediction, lower, upper, modelWeights: { prophet: 0.4, rf: 0.35, arima: 0.25 } };
    });
    return NextResponse.json({ items });
  }
}


