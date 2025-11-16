import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MapConfig {
  name: string;
  regions: any;
  createdAt: string;
}

interface MapsIndex {
  maps: Array<{ id: string; config: MapConfig }>;
  activeMapId: string | null;
}

const MAPS_DIR = path.join(process.cwd(), 'lib', 'maps');
const INDEX_FILE = path.join(MAPS_DIR, 'index.json');

function ensureMapsDir() {
  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true });
  }
}

function loadIndex(): MapsIndex {
  ensureMapsDir();
  if (fs.existsSync(INDEX_FILE)) {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  }
  return { maps: [], activeMapId: null };
}

function saveIndex(index: MapsIndex) {
  ensureMapsDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

export async function POST(request: Request) {
  try {
    const data: MapConfig = await request.json();
    
    const mapId = Date.now().toString();
    const index = loadIndex();
    
    // Yeni haritayı ekle
    index.maps.push({ id: mapId, config: data });
    
    // İlk harita ise aktif yap
    if (index.maps.length === 1) {
      index.activeMapId = mapId;
    }
    
    saveIndex(index);
    
    return NextResponse.json({ success: true, mapId });
  } catch (error) {
    console.error('Config save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}
