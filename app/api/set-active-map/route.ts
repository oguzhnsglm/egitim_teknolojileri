import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MapsIndex {
  maps: Array<{ id: string; config: any }>;
  activeMapId: string | null;
}

const MAPS_DIR = path.join(process.cwd(), 'lib', 'maps');
const INDEX_FILE = path.join(MAPS_DIR, 'index.json');

function loadIndex(): MapsIndex {
  if (fs.existsSync(INDEX_FILE)) {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  }
  return { maps: [], activeMapId: null };
}

function saveIndex(index: MapsIndex) {
  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true });
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

export async function POST(request: Request) {
  try {
    const { mapId } = await request.json();
    
    const index = loadIndex();
    
    // Haritanın var olduğunu kontrol et
    const mapExists = index.maps.some(m => m.id === mapId);
    if (!mapExists) {
      return NextResponse.json({ success: false, error: 'Map not found' }, { status: 404 });
    }
    
    // Aktif haritayı güncelle
    index.activeMapId = mapId;
    saveIndex(index);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set active map error:', error);
    return NextResponse.json({ success: false, error: 'Failed to set active' }, { status: 500 });
  }
}
