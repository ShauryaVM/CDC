"use client";
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SentimentResponse } from '@/lib/schemas';

type Props = { data: SentimentResponse, industries: string[] };

export default function SentimentOrbit({ data, industries }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / 420, 0.1, 1000);
    camera.position.set(0, 0, 24);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, 420);
    container.appendChild(renderer.domElement);
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 32), new THREE.MeshStandardMaterial({ color: 0x0b0f1a }));
    scene.add(nucleus);

    const group = new THREE.Group();
    scene.add(group);

    industries.forEach((ind, idx) => {
      const items = data.items.filter(i => i.industry_id === ind);
      const last = items[items.length - 1]?.sentiment ?? 0;
      const radius = 6 + idx * 1.6;
      const geom = new THREE.SphereGeometry(0.35 + Math.max(0, last) * 0.35, 20, 20);
      const color = last > 0.3 ? 0x00ff66 : (last < -0.3 ? 0xff3366 : 0xffcc33);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
      const sat = new THREE.Mesh(geom, mat);
      const angle = (idx / Math.max(1, industries.length)) * Math.PI * 2;
      sat.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(angle * 0.7));
      (sat as any)._radius = radius;
      (sat as any)._speed = 0.002 + (last + 1) * 0.002;
      (sat as any)._theta = angle;
      group.add(sat);
    });

    let req = 0;
    const tick = () => {
      req = requestAnimationFrame(tick);
      group.children.forEach((sat) => {
        const s = sat as any;
        s._theta += s._speed;
        sat.position.set(Math.cos(s._theta) * s._radius, Math.sin(s._theta) * s._radius, Math.sin(s._theta * 0.7));
      });
      renderer.render(scene, camera);
    };
    tick();

    const resize = () => {
      camera.aspect = container.clientWidth / 420;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, 420);
    };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(req); window.removeEventListener('resize', resize); renderer.dispose(); container.removeChild(renderer.domElement); };
  }, [data, industries]);

  return <div ref={containerRef} className="w-full rounded border border-neutral-800 bg-black/30" />;
}


