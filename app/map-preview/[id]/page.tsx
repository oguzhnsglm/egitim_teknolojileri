'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface RegionConfig {
  name: string;
  color: string;
  cities: string[];
}

interface MapConfig {
  id: string;
  name: string;
  regions: Record<string, RegionConfig>;
  createdAt: string;
}

// Önizleme için özel harita bileşeni
function PreviewMap({ 
  REGIONS, 
  CITY_TO_REGION 
}: { 
  REGIONS: Record<string, { name: string; color: string }>;
  CITY_TO_REGION: Record<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>();

  useEffect(() => {
    fetch('/map/turkey.svg')
      .then((res) => res.text())
      .then(setSvgMarkup);
  }, []);

  const applyStyles = useCallback(() => {
    if (!containerRef.current) return;

    const paths = containerRef.current.querySelectorAll<SVGPathElement>(
      '#turkey-provinces path[id^="TR-"]'
    );

    paths.forEach((path) => {
      const code = path.id;
      const region = CITY_TO_REGION[code];
      const baseColor = REGIONS[region]?.color ?? '#1f2937';

      path.style.fill = baseColor;
      path.style.stroke = '#0f172a';
      path.style.strokeWidth = '1';
      path.style.transition = 'all 0.2s ease';
      path.style.cursor = 'default';
      path.style.opacity = '0.9';
    });
  }, [REGIONS, CITY_TO_REGION]);

  useEffect(() => {
    if (svgMarkup && Object.keys(REGIONS).length > 0) {
      applyStyles();
    }
  }, [svgMarkup, REGIONS, applyStyles]);

  if (!svgMarkup) {
    return <div className="text-center py-8">Harita yükleniyor...</div>;
  }

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
      className="w-full h-auto"
    />
  );
}

export default function MapPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const mapId = (params?.id as string) || '';
  
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        const response = await fetch(`/api/get-map-by-id?id=${mapId}`);
        if (!response.ok) {
          throw new Error('Harita bulunamadı');
        }
        const data = await response.json();
        setMapConfig(data);
      } catch (error) {
        console.error('Harita yüklenirken hata:', error);
        alert('Harita yüklenemedi');
        router.push('/map-selector');
      } finally {
        setLoading(false);
      }
    };

    fetchMapConfig();
  }, [mapId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-2xl">Harita yükleniyor...</div>
      </div>
    );
  }

  if (!mapConfig) {
    return null;
  }

  // TurkeyMap bileşeni için REGIONS ve CITY_TO_REGION formatına çevir
  const REGIONS: Record<string, { name: string; color: string }> = {};
  const CITY_TO_REGION: Record<string, string> = {};

  Object.entries(mapConfig.regions).forEach(([regionId, region]) => {
    REGIONS[regionId] = {
      name: region.name,
      color: region.color,
    };
    region.cities.forEach((cityCode) => {
      CITY_TO_REGION[cityCode] = regionId;
    });
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">📍 {mapConfig.name}</h1>
            <p className="text-gray-300">Harita Önizleme</p>
          </div>
          <button
            onClick={() => router.push('/map-selector')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
          >
            ← Geri Dön
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Bölgeler</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(mapConfig.regions).map(([regionId, region]) => (
                <div
                  key={regionId}
                  className="flex items-center gap-3 bg-white/5 rounded-lg p-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-white/30"
                    style={{ backgroundColor: region.color }}
                  />
                  <div>
                    <div className="font-semibold">{region.name}</div>
                    <div className="text-sm text-gray-400">
                      {region.cities.length} şehir
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-6 overflow-auto">
            <div className="w-full min-w-[800px]">
              <PreviewMap
                REGIONS={REGIONS}
                CITY_TO_REGION={CITY_TO_REGION}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
