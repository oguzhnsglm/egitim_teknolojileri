'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SavedMap {
  id: string;
  name: string;
  createdAt: string;
  regionCount: number;
  isActive: boolean;
}

export default function MapSelectorPage() {
  const router = useRouter();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMaps = async () => {
    try {
      const response = await fetch('/api/list-maps');
      const data = await response.json();
      setMaps(data.maps || []);
    } catch (error) {
      console.error('Maps load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, []);

  const handleSelectMap = async (mapId: string) => {
    try {
      const response = await fetch('/api/set-active-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId })
      });

      if (response.ok) {
        alert('Harita aktif edildi! ✅');
        loadMaps();
      } else {
        alert('Harita seçme hatası!');
      }
    } catch (error) {
      console.error('Select error:', error);
      alert('Harita seçme hatası!');
    }
  };

  const handleDeleteMap = async (mapId: string, mapName: string) => {
    if (!confirm(`"${mapName}" haritasını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/delete-map?mapId=${mapId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Harita silindi! 🗑️');
        loadMaps();
      } else {
        alert('Silme hatası!');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme hatası!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">🗺️ Haritalarım</h1>
            <p className="text-gray-400">Kayıtlı haritalarınızı yönetin</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              ← Ana Sayfa
            </Link>
            <Link
              href="/map-editor"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
            >
              + Yeni Harita
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
        ) : maps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Henüz kaydedilmiş harita yok</p>
            <Link
              href="/map-editor"
              className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
            >
              İlk Haritanı Oluştur
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {maps.map((map) => (
              <div
                key={map.id}
                className={`p-6 rounded-lg border-2 transition ${
                  map.isActive
                    ? 'bg-green-900/20 border-green-500'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{map.name}</h3>
                      {map.isActive && (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                          ✓ Aktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>📍 {map.regionCount} bölge</span>
                      <span>
                        📅{' '}
                        {new Date(map.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/map-preview/${map.id}`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
                    >
                      👁️ Göster
                    </Link>
                    {!map.isActive && (
                      <button
                        onClick={() => handleSelectMap(map.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
                      >
                        ✓ Aktif Yap
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMap(map.id, map.name)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
