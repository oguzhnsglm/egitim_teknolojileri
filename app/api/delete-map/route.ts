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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mapId = searchParams.get('mapId');
    
    if (!mapId) {
      return NextResponse.json({ success: false, error: 'Map ID required' }, { status: 400 });
    }
    
    const index = loadIndex();
    
    // Haritayı listeden kaldır
    index.maps = index.maps.filter(m => m.id !== mapId);
    
    // Aktif harita siliniyorsa, ilk haritayı aktif yap
    if (index.activeMapId === mapId) {
      index.activeMapId = index.maps.length > 0 ? index.maps[0].id : null;
    }
    
    saveIndex(index);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete map error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
