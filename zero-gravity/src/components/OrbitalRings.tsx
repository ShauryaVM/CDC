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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / 420, 0.1, 1000);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, 420);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0x88aaff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    const earthGeo = new THREE.SphereGeometry(4.2, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x1d3b8b, roughness: 0.7, metalness: 0.1 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const colors = [0xff6b35, 0xf7931e, 0xc5d86d, 0x845ec2, 0x41b3a3, 0xe27d60];
    data.items.forEach((it, idx) => {
      const last = it.prediction[it.prediction.length - 1] || 1;
      const baseRadius = 7 + idx * 2.2;
      const radius = baseRadius + Math.min(6, Math.log10(Math.max(2, last)));
      const torus = new THREE.TorusGeometry(radius, 0.08, 16, 128);
      const mat = new THREE.MeshStandardMaterial({ color: colors[idx % colors.length], emissive: colors[idx % colors.length], emissiveIntensity: 0.25 });
      const mesh = new THREE.Mesh(torus, mat);
      mesh.rotation.x = Math.PI / 2;
      ringGroup.add(mesh);

      const pts = new Float32Array(3 * it.prediction.length);
      for (let i = 0; i < it.prediction.length; i++) {
        const a = (i / it.prediction.length) * Math.PI * 2;
        pts[3 * i] = Math.cos(a) * radius;
        pts[3 * i + 1] = Math.sin(a) * radius;
        pts[3 * i + 2] = Math.sin(a * 3) * 0.25;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const pmat = new THREE.PointsMaterial({ size: 0.12, color: colors[idx % colors.length] });
      const points = new THREE.Points(g, pmat);
      ringGroup.add(points);
    });

    let req = 0;
    const animate = () => {
      req = requestAnimationFrame(animate);
      earth.rotation.y += 0.0025;
      ringGroup.rotation.z += 0.0015;
      renderer.render(scene, camera);
    };
    animate();

    const handle = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / 420;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, 420);
    };
    window.addEventListener('resize', handle);

    return () => {
      cancelAnimationFrame(req);
      window.removeEventListener('resize', handle);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [data]);

  return (
    <div ref={containerRef} className="w-full rounded border border-neutral-800 bg-black/30" />
  );
}


