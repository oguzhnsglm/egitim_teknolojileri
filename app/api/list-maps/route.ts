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
    
    const maps = index.maps.map(m => ({
      id: m.id,
      name: m.config.name,
      createdAt: m.config.createdAt,
      regionCount: Object.keys(m.config.regions || {}).length,
      isActive: m.id === index.activeMapId
    }));
    
    return NextResponse.json({ maps });
  } catch (error) {
    console.error('List maps error:', error);
    return NextResponse.json({ maps: [] }, { status: 500 });
  }
}
