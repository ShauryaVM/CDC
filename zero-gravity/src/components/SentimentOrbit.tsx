"use client";
import * as React from 'react';
import type { SentimentResponse } from '@/lib/schemas';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

export default function SentimentOrbit({ data, industries }: { data: SentimentResponse; industries: string[] }) {
  const rows = React.useMemo(() => {
    const byPeriod: Record<string, any> = {};
    for (const it of data.items) {
      if (!industries.includes(it.industry_id)) continue;
      if (!byPeriod[it.period]) byPeriod[it.period] = { period: it.period };
      byPeriod[it.period][it.industry_id] = Math.round((it.sentiment ?? 0) * 100) / 100;
    }
    return Object.values(byPeriod).sort((a: any, b: any) => a.period.localeCompare(b.period));
  }, [data, industries]);

  const colors = ['#22d3ee', '#22c55e', '#a78bfa', '#f59e0b', '#f97316', '#10b981'];
  const series = industries.map((id, i) => ({ key: id, color: colors[i % colors.length] }));

  return (
    <Card className="p-4 border border-neutral-800 bg-neutral-950">
      <CardHeader className="pb-2"><CardTitle>Sentiment Index</CardTitle></CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="period" stroke="#666" tickMargin={6} />
            <YAxis stroke="#666" domain={[-1, 1]} />
            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }} />
            <Legend />
            {series.map(s => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


