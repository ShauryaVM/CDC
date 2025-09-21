"use client";
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { JobsGeo } from '@/lib/schemas';

type Props = { geo: JobsGeo[], year: number, onStateSelect?: (state: string) => void };

const STATE_COORDS: Record<string, [number, number]> = {
  AL: [-86.9023, 32.3182], AK: [-149.4937, 64.2008], AZ: [-111.0937, 34.0489], AR: [-91.8318, 35.2010],
  CA: [-119.4179, 36.7783], CO: [-105.7821, 39.5501], CT: [-72.7554, 41.6032], DE: [-75.5277, 38.9108],
  DC: [-77.0369, 38.9072], FL: [-81.6868, 27.7663], GA: [-82.9001, 32.1656], HI: [-155.5828, 19.8968],
  ID: [-114.7420, 44.0682], IL: [-89.3985, 40.6331], IN: [-86.1349, 40.2672], IA: [-93.0977, 41.8780],
  KS: [-96.7265, 39.0119], KY: [-84.2700, 37.8393], LA: [-91.9623, 30.9843], ME: [-69.4455, 45.2538],
  MD: [-76.6413, 39.0458], MA: [-71.3824, 42.4072], MI: [-84.5555, 44.3148], MN: [-94.6859, 46.7296],
  MS: [-89.3985, 32.3547], MO: [-91.8318, 37.9643], MT: [-110.3626, 46.8797], NE: [-99.9018, 41.4925],
  NV: [-116.4194, 38.8026], NH: [-71.5724, 43.1939], NJ: [-74.4057, 40.0583], NM: [-105.8701, 34.5199],
  NY: [-74.2179, 43.2994], NC: [-79.0193, 35.7596], ND: [-101.0020, 47.5515], OH: [-82.9071, 40.4173],
  OK: [-97.0929, 35.0078], OR: [-120.5542, 43.8041], PA: [-77.1945, 41.2033], RI: [-71.4774, 41.5801],
  SC: [-81.1637, 33.8361], SD: [-99.9018, 43.9695], TN: [-86.5804, 35.5175], TX: [-99.9018, 31.9686],
  UT: [-111.0937, 39.3200], VT: [-72.5778, 44.5588], VA: [-78.6569, 37.4316], WA: [-120.7401, 47.7511],
  WV: [-80.4549, 38.5976], WI: [-88.7879, 43.7844], WY: [-107.2903, 43.0759], PR: [-66.5901, 18.2208],
};

export default function JobsGlobe({ geo, year, onStateSelect }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [legend, setLegend] = useState<{min:number; mid:number; max:number} | null>(null);

  // Create the map once
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return; // token required for map rendering
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
      // Add empty source and layer; data is set in the updater effect
      if (!map.getSource('jobs')) {
        map.addSource('jobs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
      }
      if (!map.getLayer('jobs-circles')) {
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
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        map.on('mouseenter', 'jobs-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'jobs-circles', () => { map.getCanvas().style.cursor = ''; });
        map.on('click', 'jobs-circles', (e: any) => {
          const f = e?.features?.[0];
          const state = f?.properties?.state as string | undefined;
          if (state && onStateSelect) onStateSelect(state);
        });
      }
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update data when geo or year changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const features = geo.filter((g) => g.year === year).map((g) => {
      const coord = STATE_COORDS[g.state as keyof typeof STATE_COORDS];
      if (!coord) return null;
      return {
        type: 'Feature',
        properties: { title: `${g.state} ${g.industry_id}`, state: g.state, size: g.employment_total },
        geometry: { type: 'Point', coordinates: coord },
      } as any;
    }).filter(Boolean);
    const src = map.getSource('jobs') as mapboxgl.GeoJSONSource | undefined;
    if (src && (src as any).setData) {
      (src as any).setData({ type: 'FeatureCollection', features } as any);
    }

    // Dynamic color and radius scaling based on current year's distribution
    const sizes = (features as any[]).map(f => Number(f.properties.size)).filter(Number.isFinite);
    if (sizes.length) {
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);
      const mid = min + (max - min) * 0.5;
      setLegend({min, mid, max});
      // Blue → Purple scale per your theme
      const colorExpr: any = [
        'interpolate', ['linear'], ['get', 'size'],
        min, '#3b82f6', // blue-600
        mid, '#8b5cf6', // violet-500
        max, '#a78bfa'  // violet-400
      ];
      const radiusExpr: any = [
        'interpolate', ['linear'], ['get', 'size'],
        min, 4,
        mid, 10,
        max, 18
      ];
      if (map.getLayer('jobs-circles')) {
        map.setPaintProperty('jobs-circles', 'circle-color', colorExpr as any);
        map.setPaintProperty('jobs-circles', 'circle-radius', radiusExpr as any);
      }
    }
  }, [geo, year]);

  return (
    <div className="space-y-2">
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="text-xs text-amber-400">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local for globe visualization.</div>
      )}
      <div className="relative">
        <div ref={ref} className="w-full h-[420px] rounded border border-neutral-800" />
        {legend && (
          <div className="absolute left-2 top-2 rounded bg-black/60 text-xs text-neutral-200 px-2 py-1 border border-neutral-700">
            <div className="font-medium">Legend</div>
            <div>Color/size = jobs ({year})</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background:'#3b82f6' }} />
              <span>Low ~ {legend.min.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background:'#8b5cf6' }} />
              <span>Mid ~ {legend.mid.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background:'#a78bfa' }} />
              <span>High ~ {legend.max.toLocaleString()}</span>
            </div>
            <div className="mt-1 text-[10px] text-neutral-400">Click a dot to see state portfolio below.</div>
          </div>
        )}
      </div>
    </div>
  );
}


