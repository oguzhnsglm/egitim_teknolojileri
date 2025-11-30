'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/state';

type CloudConfig = {
  position: string;
  scale: number;
  variant: 'wide' | 'cluster';
  flip?: boolean;
};

const CLOUDS: CloudConfig[] = [
  { position: 'top-6 left-[-12%]', scale: 0.6, variant: 'cluster' },
  { position: 'top-10 left-[2%]', scale: 0.72, variant: 'wide' },
  { position: 'top-24 left-[10%]', scale: 0.48, variant: 'cluster' },
  { position: 'top-38 left-[20%]', scale: 0.45, variant: 'cluster' },
  { position: 'center left-[-15%]', scale: 0.9, variant: 'wide' },
  { position: 'mid-bottom left-[5%]', scale: 0.7, variant: 'wide' },
  { position: 'bottom-18 left-[16%]', scale: 0.55, variant: 'cluster' },
  { position: 'bottom-8 left-[3%]', scale: 0.5, variant: 'cluster' },
  { position: 'center left-[10%]', scale: 0.55, variant: 'cluster' },
  { position: 'center right-[10%]', scale: 0.55, variant: 'cluster', flip: true },
  { position: 'top-6 right-[-12%]', scale: 0.6, variant: 'cluster', flip: true },
  { position: 'top-10 right-[2%]', scale: 0.72, variant: 'wide', flip: true },
  { position: 'top-24 right-[10%]', scale: 0.48, variant: 'cluster', flip: true },
  { position: 'top-38 right-[20%]', scale: 0.45, variant: 'cluster', flip: true },
  { position: 'center right-[-15%]', scale: 0.9, variant: 'wide', flip: true },
  { position: 'mid-bottom right-[5%]', scale: 0.7, variant: 'wide', flip: true },
  { position: 'bottom-18 right-[16%]', scale: 0.55, variant: 'cluster', flip: true },
  { position: 'bottom-8 right-[3%]', scale: 0.5, variant: 'cluster', flip: true },
];

const CLOUD_SHAPES: Record<CloudConfig['variant'], Array<{ x: number; y: number; size: number; opacity: number }>> = {
  wide: [
    { x: -60, y: 20, size: 90, opacity: 0.85 },
    { x: -10, y: 0, size: 110, opacity: 0.9 },
    { x: 70, y: -12, size: 130, opacity: 0.95 },
    { x: 150, y: 8, size: 100, opacity: 0.85 },
    { x: 200, y: 18, size: 80, opacity: 0.75 },
  ],
  cluster: [
    { x: -30, y: 15, size: 70, opacity: 0.85 },
    { x: 10, y: 0, size: 90, opacity: 0.92 },
    { x: 70, y: -10, size: 105, opacity: 0.95 },
    { x: 130, y: 4, size: 80, opacity: 0.85 },
    { x: 170, y: 12, size: 65, opacity: 0.75 },
  ],
};

function SoftCloud({ variant, className, flip }: { variant: CloudConfig['variant']; className?: string; flip?: boolean }) {
  const pieces = CLOUD_SHAPES[variant];
  return (
    <div
      className={`relative ${className ?? ''}`}
      style={{
        width: 260,
        height: 120,
        transform: flip ? 'scaleX(-1)' : 'none',
      }}
    >
      {pieces.map((piece, index) => (
        <span
          key={`${variant}-${index}`}
          className="absolute rounded-full"
          style={{
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size * 0.72,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,0.1) 100%)',
            opacity: piece.opacity,
            filter: 'blur(1px)',
            boxShadow: '0 6px 30px rgba(255,255,255,0.45)',
          }}
        />
      ))}
      <span className="absolute left-32 top-92 h-6 w-80 rounded-full bg-white/30 blur-lg opacity-70" />
    </div>
  );
}

export default function LobbyPage() {
  const resetStore = useGameStore((state) => state.reset);
  const [isEditorMode, setIsEditorMode] = useState(false);

  useEffect(() => {
    resetStore();
  }, [resetStore]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('editor_access') : null;
    if (stored === 'true') {
      setIsEditorMode(true);
    }

    const handleSecretToggle = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'E' || event.key === 'e')) {
        event.preventDefault();
        setIsEditorMode((prev) => {
          const next = !prev;
          if (typeof window !== 'undefined') {
            if (next) {
              localStorage.setItem('editor_access', 'true');
            } else {
              localStorage.removeItem('editor_access');
            }
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleSecretToggle);
    return () => window.removeEventListener('keydown', handleSecretToggle);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 text-slate-900">
      <div className="pointer-events-none absolute inset-0 z-20 opacity-95 mix-blend-screen">
        {CLOUDS.map((cloud, index) => (
          <div
            key={`${cloud.position}-${index}`}
            className={`absolute ${cloud.position} animate-cloud-drift`}
            style={{
              animationDelay: `${index * 1.5}s`,
              transform: `scale(${cloud.scale}) ${cloud.flip ? 'scaleX(-1)' : 'scaleX(1)'}`,
            }}
          >
            <SoftCloud variant={cloud.variant} className="drop-shadow-[0_8px_25px_rgba(32,54,82,0.12)]" flip={cloud.flip} />
          </div>
        ))}
      </div>
      {isEditorMode && (
        <div className="fixed right-6 top-6">
          <Link
            href="/map-selector"
            className="inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-white/70 px-5 py-2 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur hover:bg-white"
          >
            Haritalarim
          </Link>
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-7xl rounded-[52px] border border-white/45 bg-white/15 p-18 shadow-2xl shadow-slate-700/20 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-indigo-950">Anadolu Hakimiyeti</p>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-indigo-950 drop-shadow-md md:text-5xl">
            Anadolu Hakimiyeti: Soruları bil, bölgeyi ele geçir.
          </h1>
          <Link
            href="/play"
            className="group relative mt-10 inline-flex min-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/80 px-10 py-4 text-base font-semibold text-indigo-950 shadow-xl shadow-slate-400/60 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <span className="tracking-wide">Oyuna Başla</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
