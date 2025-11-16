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

export async function GET() {
  try {
    const index = loadIndex();
    
    if (index.activeMapId) {
      const activeMap = index.maps.find(m => m.id === index.activeMapId);
      if (activeMap) {
        return NextResponse.json(activeMap.config);
      }
    }
    
    // Aktif harita yoksa boş döndür
    return NextResponse.json({ regions: {} });
  } catch (error) {
    console.error('Config load error:', error);
    return NextResponse.json({ regions: {} }, { status: 500 });
  }
}
