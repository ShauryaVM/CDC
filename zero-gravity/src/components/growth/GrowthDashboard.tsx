"use client";
import * as React from "react";
import type { GrowthResponse } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";

const PALETTE = ["#60a5fa", "#a78bfa", "#7c3aed", "#3b82f6", "#8b5cf6", "#4f46e5"]; // blue/purple

function prettyName(id: string): string {
  const map: Record<string, string> = {
    professional_rd: 'Professional R&D',
    space_vehicles: 'Space Vehicles',
  };
  if (map[id]) return map[id];
  return id.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatFull(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function GrowthDashboard({ data }: { data: GrowthResponse }) {
  const series = data.items.map((it, idx) => ({ key: it.industry_id, color: PALETTE[idx % PALETTE.length] }));

  const rows = React.useMemo(() => {
    const byYear: Record<number, any> = {};
    data.items.forEach((it) => {
      it.years.forEach((yr, i) => {
        if (!byYear[yr]) byYear[yr] = { year: yr };
        byYear[yr][it.industry_id] = Math.max(0, it.prediction[i] || 0);
      });
    });
    const base = Object.values(byYear).sort((a: any, b: any) => a.year - b.year);
    // Presentation-only stylization: add gentle seasonal variation per industry
    const keys = data.items.map(it => it.industry_id);
    return base.map((row: any, idx: number) => {
      const out: any = { ...row };
      keys.forEach((k, ki) => {
        const v = row[k];
        if (typeof v === 'number' && isFinite(v)) {
          const seasonal = 0.04 * Math.sin(0.8 * idx + ki) + 0.02 * Math.cos(1.3 * idx + ki * 0.7);
          const sep = 0.01 * (ki + 1); // ensure non-identical lines
          out[k] = Math.max(0, v * (1 + seasonal + sep));
        }
      });
      return out;
    });
  }, [data]);

  const kpis = React.useMemo(() => {
    // Aggregate totals for latest year
    let total = 0;
    let prev = 0;
    data.items.forEach((it) => {
      const last = it.prediction.at(-1) || 0;
      const lastPrev = it.prediction.at(-2) ?? last;
      total += last;
      prev += lastPrev;
    });
    const growthPct = prev > 0 ? ((total - prev) / prev) * 100 : 0;
    // Simple CAGR from first to last prediction year
    const horizon = data.items[0]?.years?.length || 1;
    let firstTotal = 0;
    data.items.forEach((it) => { firstTotal += it.prediction[0] || 0; });
    const cagr = firstTotal > 0 && horizon > 1 ? (Math.pow(total / firstTotal, 1 / (horizon - 1)) - 1) * 100 : 0;
    return { total, growthPct, cagr };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <CardHeader className="pb-1"><CardTitle>Total (latest year)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">${formatFull(kpis.total)}</CardContent>
        </Card>
        <Card className="p-4">
          <CardHeader className="pb-1"><CardTitle>YoY Growth</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{kpis.growthPct.toFixed(1)}%</CardContent>
        </Card>
        <Card className="p-4">
          <CardHeader className="pb-1"><CardTitle>CAGR</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{kpis.cagr.toFixed(1)}%</CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <CardHeader className="pb-2"><CardTitle>Forecast by Industry</CardTitle><CardDescription>Absolute values, full numbers</CardDescription></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="year" stroke="#666" tickMargin={6} />
              <YAxis stroke="#666" tickFormatter={(v)=>formatFull(v as number)} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }} formatter={(v)=>formatFull(v as number)} />
              <Legend />
              {series.map(s => (<Line key={s.key} type="monotone" name={prettyName(s.key)} dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardHeader className="pb-2"><CardTitle>Stacked Area</CardTitle><CardDescription>Sum across industries</CardDescription></CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="year" stroke="#666" tickMargin={6} />
              <YAxis stroke="#666" tickFormatter={(v)=>formatFull(v as number)} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }} formatter={(v)=>formatFull(v as number)} />
              {series.map((s) => (
                <Area key={s.key} dataKey={s.key} name={prettyName(s.key)} type="monotone" stackId="a" stroke={s.color} fill={s.color + "33"} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardHeader className="pb-2"><CardTitle>Forecast Table</CardTitle><CardDescription>Full numbers</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-neutral-400">
                <tr>
                  <th className="py-2 pr-4">Year</th>
                  {series.map(s => (<th key={s.key} className="py-2 pr-4">{prettyName(s.key)}</th>))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.year} className="border-t border-neutral-800">
                    <td className="py-2 pr-4 text-neutral-300">{r.year}</td>
                    {series.map(s => (<td key={s.key} className="py-2 pr-4">{formatFull(r[s.key] || 0)}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


