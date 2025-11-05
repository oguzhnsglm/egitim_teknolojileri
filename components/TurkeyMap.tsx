'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CityState } from '@/types/realtime';

interface TurkeyMapProps {
  cities: CityState[];
  onSelect: (cityCode: string) => void;
  disabled?: boolean;
  activeCityCode?: string;
}

const SELECTOR = '#turkey-provinces path[id^="TR-"]';
const DEFAULT_FILL = '#1f2937';
const BASE_STROKE = '#0f172a';
const ACTIVE_STROKE = '#facc15';

export function TurkeyMap({ cities, onSelect, disabled, activeCityCode }: TurkeyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>();

  const cityDataByCode = useMemo(() => {
    const map = new Map<string, CityState>();
    cities.forEach((city) => {
      map.set(city.code, city);
    });
    return map;
  }, [cities]);

  useEffect(() => {
    let mounted = true;
    fetch('/map/turkey.svg')
      .then((response) => response.text())
      .then((text) => {
        if (mounted) {
          setSvgMarkup(text);
        }
      })
      .catch((error) => {
        console.error('Failed to load Turkey map SVG', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgMarkup) return;
    container.innerHTML = svgMarkup;

    const svg = container.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.display = 'block';
    }
  }, [svgMarkup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const provincePaths = Array.from(container.querySelectorAll<SVGPathElement>(SELECTOR));

    const handleClick = (event: Event) => {
      if (disabled) return;
      const target = event.currentTarget as SVGPathElement;
      if (target.id) {
        onSelect(target.id);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const target = event.currentTarget as SVGPathElement;
      if (target.id) {
        onSelect(target.id);
      }
    };

    provincePaths.forEach((path) => {
      const cityInfo = cityDataByCode.get(path.id);
      const cityName = cityInfo?.name ?? path.id;

      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', `Şehir ${cityName}`);
      path.setAttribute('tabindex', disabled ? '-1' : '0');
      path.style.cursor = disabled ? 'not-allowed' : 'default';
      path.style.transition = 'transform 0.18s ease, filter 0.18s ease';
      path.style.outline = 'none';
      path.style.boxShadow = 'none';

      path.removeEventListener('click', handleClick);
      path.removeEventListener('keydown', handleKeyDown);
      path.addEventListener('click', handleClick);
      path.addEventListener('keydown', handleKeyDown);
    });

    return () => {
      provincePaths.forEach((path) => {
        path.removeEventListener('click', handleClick);
        path.removeEventListener('keydown', handleKeyDown);
      });
    };
  }, [svgMarkup, disabled, onSelect, cityDataByCode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const provincePaths = container.querySelectorAll<SVGPathElement>(SELECTOR);

    provincePaths.forEach((path) => {
      const cityInfo = cityDataByCode.get(path.id);
      const baseColor = cityInfo?.ownerColor ?? DEFAULT_FILL;
      const isActive = activeCityCode === path.id;

      path.style.fill = isActive ? shadeColor(baseColor, -12) : baseColor;
      path.style.stroke = isActive ? ACTIVE_STROKE : BASE_STROKE;
      path.style.strokeWidth = isActive ? '2.2' : '1.1';
      path.style.filter = isActive ? 'brightness(1.05)' : 'none';
    });
  }, [cityDataByCode, activeCityCode]);

  return (
    <div
      ref={containerRef}
      className="mx-auto aspect-[5/3] w-full max-w-[1600px] overflow-hidden rounded-3xl border border-slate-800 shadow-2xl"
      aria-live="polite"
    />
  );
}

function shadeColor(hex: string, percent: number) {
  const normalized = hex.replace('#', '');
  const num = parseInt(normalized, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 0 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}

export default TurkeyMap;
