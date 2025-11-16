'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface RegionData {
  name: string;
  color: string;
  cities: string[];
}

const AVAILABLE_COLORS = [
  { name: 'Turuncu', value: '#f97316' },
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Yeşil', value: '#10b981' },
  { name: 'Mor', value: '#8b5cf6' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Kahverengi', value: '#a16207' },
  { name: 'Kırmızı', value: '#dc2626' },
];

export default function MapEditorPage() {
  const router = useRouter();
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0].value);
  const [selectedRegionName, setSelectedRegionName] = useState('Bölge 1');
  const [cityAssignments, setCityAssignments] = useState<Record<string, { color: string; region: string }>>({});
  const [svgContent, setSvgContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Güncel değerlere her zaman erişmek için ref kullan
  const selectedColorRef = useRef(selectedColor);
  const selectedRegionRef = useRef(selectedRegionName);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
    selectedRegionRef.current = selectedRegionName;
  }, [selectedColor, selectedRegionName]);

  // SVG'yi yükle
  useEffect(() => {
    fetch('/map/turkey.svg')
      .then((res) => res.text())
      .then((svg) => {
        setSvgContent(svg);
      });
  }, []);

  // Güncel state'e erişim için ref
  const cityAssignmentsRef = useRef(cityAssignments);
  useEffect(() => {
    cityAssignmentsRef.current = cityAssignments;
  }, [cityAssignments]);

  // SVG render edildikten sonra event listener'ları ekle (sadece bir kez)
  useEffect(() => {
    if (!svgContent) return;

    const container = document.querySelector('#map-container');
    if (!container) return;

    const handleClick = (e: Event) => {
      const target = e.target as SVGPathElement;
      if (!target.id || !target.id.startsWith('TR-')) return;
      
      const cityCode = target.id;
      
      // Kullanıcının seçtiği renk ve bölgeyi olduğu gibi kullan
      const newAssignment = {
        color: selectedColorRef.current,
        region: selectedRegionRef.current
      };
      
      setCityAssignments(prev => {
        console.log('Assigning', cityCode, 'to', newAssignment.region, 'with color', newAssignment.color);
        return {
          ...prev,
          [cityCode]: newAssignment
        };
      });
      
      // Hemen görseli güncelle
      target.style.fill = selectedColorRef.current;
      target.style.stroke = '#0f172a';
      target.style.strokeWidth = '1.5';
    };

    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [svgContent]); // Sadece SVG yüklendiğinde çalış

  // Atamalar değiştiğinde renkleri güncelle (ayrı effect)
  useEffect(() => {
    if (!svgContent) return;

    const paths = document.querySelectorAll<SVGPathElement>('#turkey-provinces path[id^="TR-"]');
    
    paths.forEach(path => {
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
    const mapName = prompt('Harita için bir isim girin:', `Harita ${new Date().toLocaleDateString('tr-TR')}`);
    if (!mapName || !mapName.trim()) {
      alert('Harita ismi gerekli!');
      return;
    }

    setIsSaving(true);
    
    // Her şehir-renk-bölge atamasını olduğu gibi grupla
    const regions: Record<string, RegionData> = {};
    
    Object.entries(cityAssignments).forEach(([cityCode, data]) => {
      // Her renk-bölge kombinasyonu için benzersiz bir anahtar oluştur
      const regionKey = `${data.region}_${data.color}`;
      
      if (!regions[regionKey]) {
        regions[regionKey] = {
          name: data.region,
          color: data.color, // Her şehrin kendi rengi
          cities: []
        };
      }
      regions[regionKey].cities.push(cityCode);
    });

    console.log('💾 Saving regions:', regions);

    const payload = { 
      name: mapName.trim(),
      regions,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/save-map-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Harita kaydedildi! ✅');
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

  const assignedCount = Object.keys(cityAssignments).length;
  const totalCities = 81;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">🗺️ Harita Editörü</h1>
            <p className="text-gray-400">
              Şehirlere tıklayarak bölge ataması yapın ({assignedCount}/{totalCities})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              🗑️ Temizle
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || assignedCount === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {isSaving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sol panel: Ayarlar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bölge ismi */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-sm font-medium mb-2">Bölge Adı</label>
              <input
                type="text"
                value={selectedRegionName}
                onChange={(e) => setSelectedRegionName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Marmara"
              />
            </div>

            {/* Renk seçici */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <label className="block text-sm font-medium mb-3">Renk Seç</label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedColor === color.value
                        ? 'border-white scale-105'
                        : 'border-transparent hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    <span className="text-white text-xs font-semibold drop-shadow-lg">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mevcut atamalar */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-sm font-medium mb-3">📋 Bölgeler</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(
                  Object.entries(cityAssignments).reduce((acc, [code, data]) => {
                    if (!acc[data.region]) {
                      acc[data.region] = { color: data.color, count: 0 };
                    }
                    acc[data.region].count++;
                    return acc;
                  }, {} as Record<string, { color: string; count: number }>)
                ).map(([region, info]) => (
                  <div
                    key={region}
                    className="flex items-center gap-2 p-2 rounded bg-gray-700"
                  >
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="text-sm flex-1">{region}</span>
                    <span className="text-xs text-gray-400">{info.count} il</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Harita */}
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
                <div className="flex items-center justify-center h-96">
                  <div className="text-gray-400">Harita yükleniyor...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
