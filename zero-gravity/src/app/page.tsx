'use client';

import dynamic from 'next/dynamic';
const HomeCharts = dynamic(() => import('../components/HomeCharts'), { ssr: false });
export default function Home() {
  return (
    <main className="min-h-screen p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Zero-Gravity Economy Intelligence</h1>
        <p className="text-neutral-400 mb-8">Explore growth forecasts, job creation, and sentiment correlations.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/growth" className="rounded border border-neutral-800 p-6 hover:bg-neutral-900 transition">🌌 Growth Predictor</a>
          <a href="/jobs" className="rounded border border-neutral-800 p-6 hover:bg-neutral-900 transition">🏭 Job Creation</a>
          <a href="/sentiment" className="rounded border border-neutral-800 p-6 hover:bg-neutral-900 transition">📊 Sentiment Correlator</a>
        </div>
      </div>
    </main>
  );
}
