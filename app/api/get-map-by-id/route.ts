import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface RegionConfig {
  name: string;
  color: string;
  cities: string[];
}

interface MapConfigData {
  name: string;
  regions: Record<string, RegionConfig>;
  createdAt: string;
}

interface SavedMap {
  id: string;
  config: MapConfigData;
}

interface MapsIndex {
  maps: SavedMap[];
  activeMapId?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('id');

  if (!mapId) {
    return NextResponse.json({ error: 'Map ID gerekli' }, { status: 400 });
  }

  const indexPath = path.join(process.cwd(), 'lib', 'maps', 'index.json');

  try {
    // index.json dosyasını oku
    const indexData = fs.readFileSync(indexPath, 'utf-8');
    const index: MapsIndex = JSON.parse(indexData);

    // İstenen haritayı bul
    const map = index.maps.find(m => m.id === mapId);

    if (!map) {
      return NextResponse.json({ error: 'Harita bulunamadı' }, { status: 404 });
    }

    // Harita bilgilerini döndür
    return NextResponse.json({
      id: map.id,
      name: map.config.name,
      regions: map.config.regions,
      createdAt: map.config.createdAt,
    });
  } catch (error) {
    console.error('Harita yüklenirken hata:', error);
    return NextResponse.json(
      { error: 'Harita yüklenemedi' },
      { status: 500 }
    );
  }
}
