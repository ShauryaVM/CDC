"use client";
import { useEffect, useState } from 'react';
import type { GrowthResponse } from '@/lib/schemas';
import OrbitalRings from '@/components/OrbitalRings';
import dynamic from 'next/dynamic';
const GrowthLines = dynamic(() => import('@/components/GrowthLines'), { ssr: false });
const GrowthDashboard = dynamic(() => import('@/components/growth/GrowthDashboard'), { ssr: false });

export default function GrowthPage() {
  const [industries, setIndustries] = useState<string[]>(['manufacturing','space_vehicles','information','professional_rd']);
  const [horizon, setHorizon] = useState<number>(7);
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/proxy/growth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ industry_ids: industries, horizon_years: horizon }) });
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally { setLoading(false); }
  }

  useEffect(() => { run(); // auto-run on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Industry Growth Predictor</h1>
      <div className="flex items-center gap-4">
        <label>Horizon: {horizon} years</label>
        <input type="range" min={3} max={12} value={horizon} onChange={(e)=>setHorizon(parseInt(e.target.value))} />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={run} disabled={loading}>{loading ? 'Running...' : 'Forecast'}</button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data && (<div className="col-span-1 md:col-span-2 space-y-4">
          <GrowthDashboard data={data} />
        </div>)}
        {data?.items?.map((it)=> (
          <div key={it.industry_id} className="rounded border border-neutral-800 p-3">
            <div className="font-medium mb-1">{it.industry_id}</div>
            <div className="text-sm text-neutral-400">Years: {it.years.join(', ')}</div>
            <div className="text-sm">Pred: {it.prediction.map(x=>x.toFixed(0)).join(', ')}</div>
            <div className="text-xs text-neutral-500">CI: [{it.lower[0]?.toFixed(0)} - {it.upper[it.upper.length-1]?.toFixed(0)}]</div>
          </div>
        ))}
      </div>
    </div>
  );
}


