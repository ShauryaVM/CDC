"use client";
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { JobsGeo } from '@/lib/schemas';

type Props = { geo: JobsGeo[] };

const STATE_COORDS: Record<string, [number, number]> = {
  CA: [-119.4179, 36.7783],
  TX: [-99.9018, 31.9686],
  FL: [-81.6868, 27.7663],
  CO: [-105.7821, 39.5501],
  WA: [-120.7401, 47.7511],
  VA: [-78.6569, 37.4316],
  AL: [-86.9023, 32.3182],
  AZ: [-111.0937, 34.0489],
  OH: [-82.9071, 40.4173],
  NM: [-105.8701, 34.5199],
};

export default function JobsGlobe({ geo }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return; // silent fallback; page can render textual list alongside
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98, 39],
      zoom: 3.2,
      projection: 'globe' as any,
    });
    map.on('load', () => {
      map.setFog({});
      const features = geo.map((g) => {
        const coord = STATE_COORDS[g.state as keyof typeof STATE_COORDS];
        if (!coord) return null;
        return {
          type: 'Feature',
          properties: { title: `${g.state} ${g.industry_id}`, size: g.total_2030 },
          geometry: { type: 'Point', coordinates: coord },
        } as any;
      }).filter(Boolean);
      map.addSource('jobs', { type: 'geojson', data: { type: 'FeatureCollection', features } as any });
      map.addLayer({
        id: 'jobs-circles',
        type: 'circle',
        source: 'jobs',
        paint: {
          'circle-radius': ["interpolate", ["linear"], ["get", "size"], 0, 3, 50000, 10, 150000, 18],
          'circle-color': '#3fb950',
          'circle-opacity': 0.7,
          'circle-stroke-color': '#1a472a',
          'circle-stroke-width': 1,
        },
      });
    });
    return () => { map.remove(); };
  }, [geo]);

  return (
    <div className="space-y-2">
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="text-xs text-amber-400">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local for globe visualization.</div>
      )}
      <div ref={ref} className="w-full h-[420px] rounded border border-neutral-800" />
    </div>
  );
}


