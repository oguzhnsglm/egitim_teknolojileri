'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CityState } from '@/types/realtime';

interface TurkeyMapProps {
  cities: CityState[];
  onSelect: (color: string) => void;
  disabled?: boolean;
  activeColor?: string;
}

const SELECTOR = '#turkey-provinces path[id^="TR-"]';
const DEFAULT_FILL = '#1f2937';
const BASE_STROKE = '#0f172a';
const ACTIVE_STROKE = '#facc15';
const HOVER_STROKE = '#60a5fa';
const HOVER_FILTER = 'drop-shadow(0 0 8px rgba(96,165,250,0.55))';

export function TurkeyMap({ cities, onSelect, disabled, activeColor }: TurkeyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [CITY_TO_COLOR, setCITY_TO_COLOR] = useState<Record<string, string>>({});
  const [COLOR_REGIONS, setCOLOR_REGIONS] = useState<Record<string, { name: string; cities: string[] }>>({});

  // Harita konfigürasyonunu yükle
  useEffect(() => {
    console.log('🗺️ Loading map config...');
    fetch('/api/get-map-config')
      .then(res => res.json())
      .then(data => {
        console.log('📦 Map config loaded:', data);
        if (data.regions) {
          // Her şehrin rengini bul
          const cityToColor: Record<string, string> = {};
          const colorRegions: Record<string, { name: string; cities: string[] }> = {};
          
          Object.entries(data.regions).forEach(([regionKey, regionData]: [string, any]) => {
            const color = regionData.color;
            console.log(`🎨 Region ${regionKey}: color=${color}, cities=${regionData.cities.length}`);
            regionData.cities.forEach((cityCode: string) => {
              cityToColor[cityCode] = color;
            });
            
            // Aynı renkteki bölgeleri grupla
            if (!colorRegions[color]) {
              colorRegions[color] = { name: regionData.name, cities: [] };
            }
            colorRegions[color].cities.push(...regionData.cities);
          });
          
          console.log('🗂️ cityToColor entries:', Object.keys(cityToColor).length);
          console.log('🎨 Sample cities:', Object.entries(cityToColor).slice(0, 5));
          
          setCITY_TO_COLOR(cityToColor);
          setCOLOR_REGIONS(colorRegions);
          console.log('✅ Colors loaded:', Object.keys(colorRegions));
        }
      })
      .catch(err => {
        console.error('❌ Map config load error:', err);
        setCITY_TO_COLOR({});
        setCOLOR_REGIONS({});
      });
  }, []);

  const cityDataByCode = useMemo(() => {
    const map = new Map<string, CityState>();
    cities.forEach((city) => {
      map.set(city.code, city);
    });
    return map;
  }, [cities]);

  const applyBaseStyles = useCallback(
    (path: SVGPathElement) => {
      const code = path.id;
      const color = CITY_TO_COLOR[code];
      
      const baseColor = color ?? DEFAULT_FILL;
      const isActive = activeColor === color;
      const isHovered = hoveredColor === color;

      if (isActive) {
        path.style.fill = shadeColor(baseColor, 15);
        path.style.stroke = ACTIVE_STROKE;
        path.style.strokeWidth = '2.2';
        path.style.filter = 'brightness(1.15)';
        path.style.opacity = '1';
      } else if (isHovered) {
        path.style.fill = shadeColor(baseColor, 10);
        path.style.stroke = HOVER_STROKE;
        path.style.strokeWidth = '1.8';
        path.style.filter = HOVER_FILTER;
        path.style.opacity = '0.95';
      } else {
        path.style.fill = baseColor;
        path.style.stroke = BASE_STROKE;
        path.style.strokeWidth = '1.1';
        path.style.filter = 'none';
        path.style.opacity = '1';
      }
    },
    [activeColor, hoveredColor, CITY_TO_COLOR],
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
  }, [svgMarkup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgMarkup) return;

    const provincePaths = Array.from(container.querySelectorAll<SVGPathElement>(SELECTOR));

    // Her renk için event handler'lar
    const handleColorClick = (color: string) => {
      console.log('🗺️ Map clicked, color:', color, 'disabled:', disabled);
      if (disabled) return;
      console.log('✅ Calling onSelect with color:', color);
      onSelect(color);
    };

    const handleColorMouseEnter = (color: string) => {
      if (disabled) return;
      setHoveredColor(color);
    };

    const handleColorMouseLeave = () => {
      setHoveredColor(null);
    };

    provincePaths.forEach((path) => {
      const cityCode = path.id;
      const color = CITY_TO_COLOR[cityCode];
      
      if (!color) {
        // Renk atanmamış şehir - gri bırak
        console.log('⚠️ No color for city:', cityCode);
        path.style.fill = DEFAULT_FILL;
        path.style.cursor = 'default';
        return;
      }

      const colorData = COLOR_REGIONS[color];
      
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', colorData?.name || 'Bölge');
      path.setAttribute('tabindex', disabled ? '-1' : '0');
      path.style.cursor = disabled ? 'not-allowed' : 'pointer';
      path.style.transition = 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease, filter 0.2s ease';
      path.style.outline = 'none';

      applyBaseStyles(path);

      const clickHandler = () => handleColorClick(color);
      const enterHandler = () => handleColorMouseEnter(color);
      const leaveHandler = handleColorMouseLeave;
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleColorClick(color);
        }
      };

      path.addEventListener('click', clickHandler);
      path.addEventListener('mouseenter', enterHandler);
      path.addEventListener('mouseleave', leaveHandler);
      path.addEventListener('keydown', keyHandler as any);

      // Cleanup için listener'ları path'e kaydet
      (path as any)._regionListeners = { clickHandler, enterHandler, leaveHandler, keyHandler };
    });

    return () => {
      provincePaths.forEach((path) => {
        const listeners = (path as any)._regionListeners;
        if (listeners) {
          path.removeEventListener('click', listeners.clickHandler);
          path.removeEventListener('mouseenter', listeners.enterHandler);
          path.removeEventListener('mouseleave', listeners.leaveHandler);
          path.removeEventListener('keydown', listeners.keyHandler);
        }
      });
    };
  }, [svgMarkup, disabled, onSelect, applyBaseStyles, COLOR_REGIONS, CITY_TO_COLOR]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const provincePaths = container.querySelectorAll<SVGPathElement>(SELECTOR);

    provincePaths.forEach((path) => applyBaseStyles(path));
  }, [applyBaseStyles]);

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
