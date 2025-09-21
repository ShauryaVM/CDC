"use client";
import * as React from "react";
import type { GrowthResponse } from "@/lib/schemas";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const COLORS = ["#22d3ee", "#22c55e", "#a78bfa", "#f59e0b", "#f97316", "#10b981"]; 

export default function GrowthLines({ data }: { data: GrowthResponse }) {
  const rows = React.useMemo(() => {
    const byYear: Record<number, any> = {};
    data.items.forEach((it) => {
      it.years.forEach((yr, i) => {
        if (!byYear[yr]) byYear[yr] = { year: yr };
        byYear[yr][it.industry_id] = Math.round((it.prediction[i] ?? 0) * 100) / 100;
      });
    });
    return Object.values(byYear).sort((a: any, b: any) => a.year - b.year);
  }, [data]);

  const series = data.items.map((it, idx) => ({ key: it.industry_id, color: COLORS[idx % COLORS.length] }));

  return (
    <Card className="p-4 border border-neutral-800 bg-neutral-950">
      <CardHeader className="pb-2">
        <CardTitle>Industry Growth (Forecast)</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="year" stroke="#666" tickMargin={6} />
            <YAxis stroke="#666" tickFormatter={(v)=>Intl.NumberFormat('en', {notation:'compact'}).format(v as number)} />
            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }} />
            <Legend />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


