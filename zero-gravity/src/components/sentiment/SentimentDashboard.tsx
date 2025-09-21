"use client";
import * as React from "react";
import type { SentimentResponse } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";

const PALETTE = ["#60a5fa", "#a78bfa", "#7c3aed", "#3b82f6", "#8b5cf6", "#4f46e5"]; // blue/purple

export default function SentimentDashboard({ data, industries }: { data: SentimentResponse; industries: string[] }) {
  // Time-series rows
  const rows = React.useMemo(() => {
    const byPeriod: Record<string, any> = {};
    data.items.forEach((it) => {
      if (!industries.includes(it.industry_id)) return;
      if (!byPeriod[it.period]) byPeriod[it.period] = { period: it.period };
      byPeriod[it.period][it.industry_id] = Math.round((it.sentiment || 0) * 100) / 100;
    });
    return Object.values(byPeriod).sort((a: any, b: any) => a.period.localeCompare(b.period));
  }, [data, industries]);

  // Correlation bars
  const bars = React.useMemo(() => {
    return industries.map((id) => ({ industry: id, corr: data.correlations?.[id]?.current ?? 0, best: data.correlations?.[id]?.corrAtBestLag ?? 0 }));
  }, [data, industries]);

  const series = industries.map((id, i) => ({ key: id, color: PALETTE[i % PALETTE.length] }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><CardHeader className="pb-1"><CardTitle>Latest Period</CardTitle><CardDescription>Last index per industry</CardDescription></CardHeader><CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {industries.map((id,i)=>{
              const last = [...data.items].reverse().find(x=>x.industry_id===id)?.sentiment ?? 0;
              return <div key={id} className="flex items-center justify-between"><span className="text-neutral-400">{id}</span><span className="font-semibold" style={{color: PALETTE[i%PALETTE.length]}}>{last.toFixed(2)}</span></div>
            })}
          </div>
        </CardContent></Card>
        <Card className="p-4"><CardHeader className="pb-1"><CardTitle>Best Lag</CardTitle><CardDescription>Correlation peak</CardDescription></CardHeader><CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {industries.map((id)=>{
              const c = data.correlations?.[id];
              return <div key={id} className="flex items-center justify-between"><span className="text-neutral-400">{id}</span><span className="font-semibold">{c?`${c.bestLag} (${c.corrAtBestLag.toFixed(2)})`:'—'}</span></div>
            })}
          </div>
        </CardContent></Card>
        <Card className="p-4"><CardHeader className="pb-1"><CardTitle>Current Corr</CardTitle><CardDescription>vs. value added</CardDescription></CardHeader><CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {industries.map((id)=>{
              const c = data.correlations?.[id]?.current ?? 0;
              return <div key={id} className="flex items-center justify-between"><span className="text-neutral-400">{id}</span><span className="font-semibold">{c.toFixed(2)}</span></div>
            })}
          </div>
        </CardContent></Card>
      </div>

      <Card className="p-4">
        <CardHeader className="pb-2"><CardTitle>Sentiment Over Time</CardTitle><CardDescription>-1 to 1</CardDescription></CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="period" stroke="#666" />
              <YAxis stroke="#666" domain={[-1,1]} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }} />
              <Legend />
              {series.map(s => (<Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardHeader className="pb-2"><CardTitle>Correlation Bars</CardTitle><CardDescription>current vs best-lag</CardDescription></CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="#2a2a2a" vertical={false} />
              <XAxis dataKey="industry" stroke="#666" />
              <YAxis stroke="#666" domain={[-1,1]} />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }} />
              <Legend />
              <Bar dataKey="corr" fill="#60a5fa" name="current" />
              <Bar dataKey="best" fill="#a78bfa" name="best lag" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}


