'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CityState } from '@/types/realtime';
import { PROVINCE_TO_REGION, REGION_BY_CODE } from '@/lib/regions';

interface TurkeyMapProps {
  cities: CityState[];
  onSelect: (cityCode: string) => void;
  disabled?: boolean;
  activeCityCode?: string;
  provinceToRegionMap?: Record<string, string>;
}

const SELECTOR = '#turkey-provinces path[id^="TR-"]';
const DEFAULT_FILL = '#2f75c5';
const BASE_STROKE = '#5e90d6';
const ACTIVE_STROKE = '#123a73';
const HOVER_STROKE = '#8bb9f1';
const HOVER_FILTER = 'drop-shadow(0 0 12px rgba(154,200,255,0.65))';

export function TurkeyMap({ cities, onSelect, disabled, activeCityCode, provinceToRegionMap = PROVINCE_TO_REGION }: TurkeyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const provincePathsRef = useRef<SVGPathElement[]>([]);
  const regionPathsRef = useRef<Map<string, SVGPathElement[]>>(new Map());
  const [svgMarkup, setSvgMarkup] = useState<string>();

  const cityDataByCode = useMemo(() => {
    const map = new Map<string, CityState>();
    cities.forEach((city) => {
      map.set(city.code, city);
    });
    return map;
  }, [cities]);

  const applyBaseStyles = useCallback(
    (regionCode?: string) => {
      const regions = regionPathsRef.current;
      const entries: Array<[string, SVGPathElement[]]> = regionCode
        ? [[regionCode, regions.get(regionCode) ?? []]]
        : Array.from(regions.entries());
      entries.forEach(([code, paths]) => {
        if (!paths.length) return;
        const cityInfo = cityDataByCode.get(code);
        const baseColor = cityInfo?.ownerColor ?? DEFAULT_FILL;
        const isActive = activeCityCode === code;
        const ownerFill = cityInfo?.ownerColor ?? null;
        const fillColor = ownerFill ? ownerFill : DEFAULT_FILL;
        const strokeColor = ownerFill ? shadeColor(ownerFill, -25) : BASE_STROKE;

        paths.forEach((path) => {
          path.style.fill = ownerFill ? fillColor : DEFAULT_FILL;
          path.style.stroke = isActive ? ACTIVE_STROKE : strokeColor;
          path.style.strokeWidth = isActive ? '2.6' : ownerFill ? '1.6' : '1.45';
          path.style.strokeLinecap = 'round';
          path.style.strokeLinejoin = 'round';
          path.style.vectorEffect = 'non-scaling-stroke';
          path.style.filter = isActive
            ? 'brightness(1.22) saturate(1.1) drop-shadow(0 0 6px rgba(18,58,115,0.65))'
            : 'brightness(1.25) saturate(1.08)';
          path.style.transform = isActive ? 'translateY(-1px)' : 'translateY(0)';
        });
      });
    },
    [activeCityCode, cityDataByCode],
  );

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

    const provincePaths = Array.from(container.querySelectorAll<SVGPathElement>(SELECTOR));
    provincePathsRef.current = provincePaths;

    const regions = new Map<RegionCode, SVGPathElement[]>();
    provincePaths.forEach((path) => {
      const regionCode = (provinceToRegionMap[path.id] as RegionCode | string | undefined) ?? undefined;
      if (!regionCode) return;
      path.dataset.regionCode = regionCode;
      const list = regions.get(regionCode);
      if (list) {
        list.push(path);
      } else {
        regions.set(regionCode, [path]);
      }
    });
    regionPathsRef.current = regions;
    applyBaseStyles();
  }, [svgMarkup, applyBaseStyles]);

  useEffect(() => {
    const provincePaths = provincePathsRef.current;
    if (!provincePaths.length) return;

    const getRegionCode = (target: SVGPathElement): string | undefined =>
      target.dataset.regionCode ?? provinceToRegionMap[target.id];

    const handleClick = (event: Event) => {
      if (disabled) return;
      const target = event.currentTarget as SVGPathElement;
      const regionCode = getRegionCode(target);
      if (!regionCode) return;
      onSelect(regionCode);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const target = event.currentTarget as SVGPathElement;
      const regionCode = getRegionCode(target);
      if (!regionCode) return;
      onSelect(regionCode);
    };

    const handleMouseEnter = (event: Event) => {
      if (disabled) return;
      const target = event.currentTarget as SVGPathElement;
      const regionCode = getRegionCode(target);
      if (!regionCode) return;
      const paths = regionPathsRef.current.get(regionCode);
      if (!paths?.length) return;
      const isActive = activeCityCode === regionCode;
      paths.forEach((path) => {
        if (isActive) {
          path.style.transform = 'translateY(-1px)';
          return;
        }
        path.style.stroke = HOVER_STROKE;
        path.style.strokeWidth = '1.8';
        path.style.strokeLinecap = 'round';
        path.style.strokeLinejoin = 'round';
        path.style.vectorEffect = 'non-scaling-stroke';
        path.style.filter = HOVER_FILTER;
        path.style.transform = 'translateY(-1px)';
      });
    };

    const handleMouseLeave = (event: Event) => {
      const target = event.currentTarget as SVGPathElement;
      const regionCode = getRegionCode(target);
      if (!regionCode) return;
      applyBaseStyles(regionCode);
    };

    provincePaths.forEach((path) => {
      const regionCode = getRegionCode(path);
      const cityInfo = regionCode ? cityDataByCode.get(regionCode) : undefined;
      const regionInfo = regionCode ? REGION_BY_CODE[regionCode] : undefined;
      const label = cityInfo?.name ?? regionInfo?.name ?? path.id;
      const interactive = Boolean(regionCode) && !disabled;

      path.setAttribute('role', regionCode ? 'button' : 'presentation');
      path.setAttribute('aria-label', regionCode ? `Bolge ${label}` : path.id);
      path.setAttribute('tabindex', interactive ? '0' : '-1');
      path.style.cursor = interactive ? 'pointer' : 'not-allowed';
      path.style.transition =
        'transform 0.18s ease, filter 0.18s ease, stroke-width 0.18s ease, stroke 0.18s ease';
      path.style.outline = 'none';
      path.style.boxShadow = 'none';

      path.removeEventListener('click', handleClick);
      path.removeEventListener('keydown', handleKeyDown);
      path.removeEventListener('mouseenter', handleMouseEnter);
      path.removeEventListener('mouseleave', handleMouseLeave);

      if (regionCode) {
        path.addEventListener('click', handleClick);
        path.addEventListener('keydown', handleKeyDown);
        path.addEventListener('mouseenter', handleMouseEnter);
        path.addEventListener('mouseleave', handleMouseLeave);
      }
    });

    return () => {
      provincePaths.forEach((path) => {
        path.removeEventListener('click', handleClick);
        path.removeEventListener('keydown', handleKeyDown);
        path.removeEventListener('mouseenter', handleMouseEnter);
        path.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [disabled, onSelect, cityDataByCode, activeCityCode, applyBaseStyles, svgMarkup]);

  useEffect(() => {
    applyBaseStyles();
  }, [applyBaseStyles]);

  return (
    <div
      ref={containerRef}
      className="mx-auto aspect-[5/3] w-full max-w-[1600px] overflow-hidden rounded-3xl border border-slate-800 bg-[#f5f1e6] shadow-2xl"
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
