"use client";
import { useState } from 'react';
import type { JobsResponse } from '@/lib/schemas';
import JobsGlobe from '@/components/JobsGlobe';

export default function JobsPage() {
  const [industries, setIndustries] = useState<string[]>(['manufacturing','space_vehicles']);
  const [horizon, setHorizon] = useState<number>(7);
  const [prod, setProd] = useState<number>(0.02);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/proxy/jobs', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ industry_ids: industries, horizon_years: horizon, productivity_growth: prod }) });
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Job Creation Model</h1>
      <div className="flex items-center gap-4">
        <label>Horizon: {horizon} years</label>
        <input type="range" min={3} max={12} value={horizon} onChange={(e)=>setHorizon(parseInt(e.target.value))} />
        <label>Productivity growth: {(prod*100).toFixed(1)}%</label>
        <input type="range" min={0} max={0.06} step={0.005} value={prod} onChange={(e)=>setProd(parseFloat(e.target.value))} />
        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={run} disabled={loading}>{loading ? 'Computing...' : 'Compute Jobs'}</button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data && <div className="col-span-1 md:col-span-2"><JobsGlobe geo={data.geo} /></div>}
        <div className="rounded border border-neutral-800 p-3">
          <div className="font-medium mb-1">Totals</div>
          {data?.items?.slice(0, 10).map(row => (
            <div key={`${row.industry_id}-${row.year}`} className="text-sm text-neutral-300">
              {row.industry_id} {row.year}: total {row.employment_total}
            </div>
          ))}
        </div>
        <div className="rounded border border-neutral-800 p-3">
          <div className="font-medium mb-1">Geo (2030)</div>
          {data?.geo?.map(g => (
            <div key={`${g.state}-${g.industry_id}`} className="text-sm text-neutral-300">
              {g.state} ({g.industry_id}): {g.total_2030}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


