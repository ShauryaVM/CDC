"use client";
import * as React from "react";
import { cn } from "./cn";

export type ChartConfig = Record<string, { label: string; color?: string }>;

export function ChartContainer({ config, className, children }: { config: ChartConfig; className?: string; children: React.ReactNode }) {
  const styleVars = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, val] of Object.entries(config || {})) {
      if (val?.color) vars[`--color-${key}`] = val.color;
    }
    // Useful defaults if not provided
    vars['--color-desktop'] = vars['--color-desktop'] || '#60a5fa'; // blue-400
    vars['--color-mobile'] = vars['--color-mobile'] || '#34d399';  // emerald-400
    return vars as React.CSSProperties;
  }, [config]);
  return <div className={cn(className)} style={styleVars}>{children}</div>;
}

export function ChartLegend({ children, content }: { children?: React.ReactNode; content?: React.ReactNode }) {
  return <div className="mt-2 text-xs text-neutral-400">{content || children}</div>;
}

export function ChartLegendContent() {
  return <div className="text-neutral-400">Legend</div>;
}

export function ChartTooltip({ content, cursor }: { content?: React.ReactNode; cursor?: boolean }) {
  return <>{content}</>;
}

export function ChartTooltipContent({ labelFormatter }: { labelFormatter?: (v: string) => string; indicator?: string }) {
  return <div className="rounded border border-neutral-700 bg-neutral-900 p-2 text-xs">{labelFormatter ? labelFormatter("") : ""}</div>;
}


