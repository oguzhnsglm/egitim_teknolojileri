'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  expiresAt: number;
  onComplete?: () => void;
}

export function Countdown({ expiresAt, onComplete }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, expiresAt - Date.now());
        if (next === 0 && prev > 0) {
          onComplete?.();
        }
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [expiresAt, onComplete]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const isDanger = totalSeconds <= 5;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold ${
        isDanger ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
      }`}
      aria-live="polite"
    >
      <span>Süre:</span>
      <span>{totalSeconds}s</span>
    </div>
  );
}

export default Countdown;
