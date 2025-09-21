"use client";
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GrowthResponse } from '@/lib/schemas';

type Props = { data: GrowthResponse };

export default function OrbitalRings({ data }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    // Clean, top-down 2D-style rendering using Orthographic camera
    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = 420;
    const viewSize = 200; // virtual units for consistent sizing
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      -1000,
      1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Earth (flat disc)
    const earth = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.5 })
    );
    scene.add(earth);

    const palette = [0x22d3ee, 0x22c55e, 0xa78bfa, 0xf59e0b, 0xf97316, 0x10b981];

    // Normalize end values to control ring radius
    const ends = data.items.map(it => it.prediction.at(-1) || 1);
    const minV = Math.min(...ends);
    const maxV = Math.max(...ends);
    const norm = (v: number) => maxV === minV ? 0.5 : (v - minV) / (maxV - minV);

    // Draw concentric rings and moving dot per ring
    const dots: Array<{ m: THREE.Mesh, r: number, theta: number, speed: number }> = [];
    data.items.forEach((it, idx) => {
      const v = it.prediction.at(-1) || 1;
      const r = 26 + idx * 12 + norm(v) * 10; // spacing + scale

      // Ring line
      const segs = 256;
      const pos = new Float32Array(segs * 3);
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = 0;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const ring = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: palette[idx % palette.length], linewidth: 2, opacity: 0.9 }));
      scene.add(ring);

      // Moving dot sized by latest growth delta
      const last = it.prediction.at(-1) || 1;
      const prev = it.prediction.at(-2) || last;
      const growth = Math.max(0.06, Math.min(0.24, (last - prev) / Math.max(1, prev)));
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.9 + 6 * growth, 16), new THREE.MeshBasicMaterial({ color: palette[idx % palette.length] }));
      scene.add(dot);
      dots.push({ m: dot, r, theta: idx * 0.6, speed: 0.01 + 0.003 * idx });
    });

    let req = 0;
    const animate = () => {
      req = requestAnimationFrame(animate);
      dots.forEach(d => {
        d.theta += d.speed;
        d.m.position.set(Math.cos(d.theta) * d.r, Math.sin(d.theta) * d.r, 0);
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = height;
      const asp = w / h;
      camera.left = (-viewSize * asp) / 2;
      camera.right = (viewSize * asp) / 2;
      camera.top = viewSize / 2;
      camera.bottom = -viewSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(req);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [data]);

  return <div ref={containerRef} className="w-full rounded border border-neutral-800 bg-black/30" style={{ height: 420 }} />;
}


