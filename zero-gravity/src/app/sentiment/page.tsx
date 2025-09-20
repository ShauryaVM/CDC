"use client";
import { useEffect, useState } from 'react';
import type { SentimentResponse } from '@/lib/schemas';
import SentimentOrbit from '@/components/SentimentOrbit';

export default function SentimentPage() {
  const [industries, setIndustries] = useState<string[]>(['manufacturing','space_vehicles','information','professional_rd']);
  const [windowType, setWindowType] = useState<'quarterly' | 'monthly'>('quarterly');
  const [lagMax, setLagMax] = useState<number>(8);
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/proxy/sentiment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ industry_ids: industries, window: windowType, lag_max: lagMax }) });
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
      <h1 className="text-2xl font-semibold">Sentiment Correlator</h1>
      <div className="flex items-center gap-4">
        <label>Window</label>
        <select value={windowType} onChange={(e)=>setWindowType(e.target.value as 'monthly'|'quarterly')} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1">
          <option value="quarterly">Quarterly</option>
          <option value="monthly">Monthly</option>
        </select>
        <label>Max lag: {lagMax}</label>
        <input type="range" min={2} max={12} value={lagMax} onChange={(e)=>setLagMax(parseInt(e.target.value))} />
        <button className="px-4 py-2 bg-purple-600 text-white rounded" onClick={run} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze'}</button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data && <div className="col-span-1 md:col-span-2"><SentimentOrbit data={data} industries={industries} /></div>}
        <div className="rounded border border-neutral-800 p-3">
          <div className="font-medium mb-1">Correlations</div>
          {data && Object.entries(data.correlations || {}).map(([k, v]) => (
            <div key={k} className="text-sm text-neutral-300">{k}: current {v.current.toFixed(2)}, best lag {v.bestLag} (corr {v.corrAtBestLag.toFixed(2)})</div>
          ))}
        </div>
        <div className="rounded border border-neutral-800 p-3">
          <div className="font-medium mb-1">Series</div>
          {data?.items?.slice(0, 20).map(it => (
            <div key={`${it.industry_id}-${it.period}`} className="text-sm text-neutral-300">{it.industry_id} {it.period}: {it.sentiment.toFixed(2)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}


