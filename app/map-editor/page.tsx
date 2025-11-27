'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface RegionData {
  name: string;
  color: string;
  cities: string[];
}

interface RegionPreset {
  id: string;
  name: string;
  color: string;
}

type CityAssignments = Record<string, { color: string; region: string }>;

const AVAILABLE_COLORS = [
  { name: 'Turuncu', value: '#f97316' },
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Yeşil', value: '#10b981' },
  { name: 'Mor', value: '#8b5cf6' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Kahverengi', value: '#a16207' },
  { name: 'Kırmızı', value: '#dc2626' },
];

const createRegionPreset = (index: number): RegionPreset => ({
  id: `region-${Date.now()}-${index}`,
  name: `Bölge ${index + 1}`,
  color: AVAILABLE_COLORS[index % AVAILABLE_COLORS.length].value,
});

export default function MapEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingMapId = searchParams.get('mapId');
  const initialPreset = createRegionPreset(0);
  const [regionPresets, setRegionPresets] = useState<RegionPreset[]>([initialPreset]);
  const [activeRegionId, setActiveRegionId] = useState<string>(initialPreset.id);
  const activeRegion = regionPresets.find((region) => region.id === activeRegionId) ?? regionPresets[0] ?? null;
  const [cityAssignments, setCityAssignments] = useState<CityAssignments>({});
  const [svgContent, setSvgContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadedMapMeta, setLoadedMapMeta] = useState<{ name: string; createdAt: string } | null>(null);

  const selectedColorRef = useRef(activeRegion?.color ?? AVAILABLE_COLORS[0].value);
  const selectedRegionRef = useRef(activeRegion?.name ?? 'Bölge 1');

  useEffect(() => {
    if (!activeRegion) return;
    selectedColorRef.current = activeRegion.color;
    selectedRegionRef.current = activeRegion.name;
  }, [activeRegion]);

useEffect(() => {
  fetch('/map/turkey.svg')
    .then((res) => res.text())
    .then((svg) => setSvgContent(svg));
}, []);

useEffect(() => {
  if (!editingMapId) return;
  fetch(`/api/get-map-config?mapId=${editingMapId}`)
    .then((res) => res.json())
    .then((config) => {
      if (!config || !config.regions) {
        setLoadedMapMeta({ name: config?.name ?? 'Harita', createdAt: config?.createdAt ?? new Date().toISOString() });
        return;
      }
      const entries: RegionData[] = Object.values(config.regions);
      if (entries.length) {
        const presets = entries.map((region, index) => ({
          id: `region-${Date.now()}-${index}`,
          name: region.name,
          color: region.color,
        }));
        setRegionPresets(presets);
        setActiveRegionId(presets[0].id);
        const assignments: CityAssignments = {};
        entries.forEach((region) => {
          region.cities.forEach((cityCode) => {
            assignments[cityCode] = { color: region.color, region: region.name };
          });
        });
        setCityAssignments(assignments);
      }
      setLoadedMapMeta({ name: config.name ?? 'Harita', createdAt: config.createdAt ?? new Date().toISOString() });
    })
    .catch((error) => {
      console.error('Map load error', error);
    });
}, [editingMapId]);

  useEffect(() => {
    if (!svgContent) return;
    const container = document.querySelector('#map-container');
    if (!container) return;

    const handleClick = (event: Event) => {
      const target = event.target as SVGPathElement;
      if (!target.id || !target.id.startsWith('TR-')) return;
      const cityCode = target.id;
      const color = selectedColorRef.current;
      const region = selectedRegionRef.current;
      setCityAssignments((prev) => ({
        ...prev,
        [cityCode]: { color, region },
      }));
      target.style.fill = color;
      target.style.stroke = '#0f172a';
      target.style.strokeWidth = '1.5';
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [svgContent]);

  useEffect(() => {
    if (!svgContent) return;
    const paths = document.querySelectorAll<SVGPathElement>('#turkey-provinces path[id^="TR-"]');
    paths.forEach((path) => {
      const assignment = cityAssignments[path.id];
      if (assignment) {
        path.style.fill = assignment.color;
        path.style.stroke = '#0f172a';
        path.style.strokeWidth = '1.5';
      } else {
        path.style.fill = '#1f2937';
        path.style.stroke = '#0f172a';
        path.style.strokeWidth = '1.1';
      }
    });
  }, [svgContent, cityAssignments]);

  const handleSave = async () => {
    const defaultName = loadedMapMeta?.name ?? `Harita ${new Date().toLocaleDateString('tr-TR')}`;
    const mapName = prompt('Harita için bir isim girin:', defaultName);
    if (!mapName || !mapName.trim()) {
      alert('Harita ismi gerekli!');
      return;
    }
    setIsSaving(true);
    const regions: Record<string, RegionData> = {};
    Object.entries(cityAssignments).forEach(([cityCode, data]) => {
      const key = `${data.region}_${data.color}`;
      if (!regions[key]) {
        regions[key] = { name: data.region, color: data.color, cities: [] };
      }
      regions[key].cities.push(cityCode);
    });
    const payload = {
      id: editingMapId ?? undefined,
      name: mapName.trim(),
      regions,
      createdAt: loadedMapMeta?.createdAt ?? new Date().toISOString(),
    };
    try {
      const response = await fetch('/api/save-map-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        alert('Harita kaydedildi!');
        router.push('/map-selector');
      } else {
        alert('Kaydetme hatası!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Kaydetme hatası!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (confirm('Tüm atamaları temizlemek istediğinize emin misiniz?')) {
      setCityAssignments({});
    }
  };

  const handleRegionNameChange = (value: string) => {
    const previousName = activeRegion?.name;
    setRegionPresets((prev) =>
      prev.map((region) => (region.id === activeRegionId ? { ...region, name: value } : region)),
    );
    if (previousName && previousName !== value) {
      setCityAssignments((prev) => {
        const updated: CityAssignments = {};
        Object.entries(prev).forEach(([cityCode, data]) => {
          updated[cityCode] = data.region === previousName ? { ...data, region: value } : data;
        });
        return updated;
      });
    }
  };

  const handleRegionColorChange = (color: string) => {
    const regionName = activeRegion?.name;
    setRegionPresets((prev) =>
      prev.map((region) => (region.id === activeRegionId ? { ...region, color } : region)),
    );
    if (regionName) {
      setCityAssignments((prev) => {
        const updated: CityAssignments = {};
        Object.entries(prev).forEach(([cityCode, data]) => {
          updated[cityCode] = data.region === regionName ? { ...data, color } : data;
        });
        return updated;
      });
    }
  };

  const assignedCount = Object.keys(cityAssignments).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Harita Editörü</h1>
            <p className="text-gray-400">Şehirlere tıklayarak bölge ataması yapın ({assignedCount}/81)</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleClear} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
              Temizle
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || assignedCount === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tanımlı Bölgeler</span>
                <button
                  onClick={() => {
                    const newRegion = createRegionPreset(regionPresets.length);
                    setRegionPresets((prev) => [...prev, newRegion]);
                    setActiveRegionId(newRegion.id);
                  }}
                  className="text-xs px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700"
                >
                  + Yeni Bölge
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {regionPresets.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setActiveRegionId(region.id)}
                    className={`px-3 py-2 rounded-lg border text-sm transition ${
                      region.id === activeRegionId
                        ? 'border-white bg-gray-700'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-400'
                    }`}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bölge Adı</label>
                <input
                  value={activeRegion?.name ?? ''}
                  onChange={(event) => handleRegionNameChange(event.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn. Marmara"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Renk Seç</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleRegionColorChange(color.value)}
                      className={`p-3 rounded-lg border-2 transition ${
                        activeRegion?.color === color.value
                          ? 'border-white scale-105'
                          : 'border-transparent hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      <span className="text-white text-xs font-semibold drop-shadow-lg">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Son Atamalar</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(
                  Object.entries(cityAssignments).reduce((acc, [, data]) => {
                    if (!acc[data.region]) {
                      acc[data.region] = { color: data.color, count: 0 };
                    }
                    acc[data.region].count++;
                    return acc;
                  }, {} as Record<string, { color: string; count: number }>),
                ).map(([region, info]) => (
                  <div key={region} className="flex items-center gap-2 p-2 rounded bg-gray-700">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: info.color }} />
                    <span className="text-sm flex-1">{region}</span>
                    <span className="text-xs text-gray-400">{info.count} il</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-gray-800 p-6 rounded-lg">
            <div className="bg-gray-900 rounded-lg overflow-auto">
              {svgContent ? (
                <div
                  id="map-container"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                  className="w-full min-h-[600px]"
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">Harita yükleniyor...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
