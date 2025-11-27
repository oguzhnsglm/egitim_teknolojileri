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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('mapId');

    const index = loadIndex();
    let targetMap =
      (requestedId && index.maps.find((map) => map.id === requestedId)) ||
      (index.activeMapId && index.maps.find((map) => map.id === index.activeMapId)) ||
      null;

    if (targetMap) {
      return NextResponse.json({ id: targetMap.id, ...targetMap.config });
    }
    return NextResponse.json({ regions: {} });
  } catch (error) {
    console.error('Config load error:', error);
    return NextResponse.json({ regions: {} }, { status: 500 });
  }
}
