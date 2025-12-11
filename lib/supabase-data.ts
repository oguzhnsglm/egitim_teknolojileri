import { supabaseClient } from './supabase-client';
import { REGIONS } from './regions';
import type { LocalQuestion } from './state';

type RawRow = Record<string, unknown>;

type RegionMeta = {
  id: number;
  name: string;
  code?: string;
};

const REGION_NAME_LOOKUP = REGIONS.reduce<Map<string, (typeof REGIONS)[number]>>((acc, region) => {
  acc.set(normalizeText(region.name), region);
  return acc;
}, new Map());

const SUBJECT_KEY_MAP: Array<{ subject: string; keys: string[] }> = [
  { subject: 'math', keys: ['matematik', 'matematikdersi', 'math'] },
  { subject: 'history', keys: ['tarih', 'history'] },
  { subject: 'geography', keys: ['cografya', 'cografi', 'geography'] },
  { subject: 'turkish', keys: ['turkce', 'turkcedil', 'turkish'] },
  { subject: 'culture', keys: ['fenbilimleri', 'fenbilimi', 'fenbilimleri', 'fenbilimler', 'kultur', 'genelkultur', 'culture'] },
];

const CHOICE_KEYS: Array<string[]> = [
  ['a', 'secenek_a', 'choice_a'],
  ['b', 'secenek_b', 'choice_b'],
  ['c', 'secenek_c', 'choice_c'],
  ['d', 'secenek_d', 'choice_d'],
];

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '');
}

function normalizeText(value?: string | null) {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

function createNormalizedMap(row: RawRow) {
  const map = new Map<string, unknown>();
  Object.entries(row).forEach(([key, value]) => {
    map.set(normalizeKey(key), value);
  });
  return map;
}

function readString(map: Map<string, unknown>, candidates: string[], fallback?: string) {
  for (const candidate of candidates) {
    const value = map.get(normalizeKey(candidate));
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
  }
  return fallback;
}

function readNumber(map: Map<string, unknown>, candidates: string[]) {
  const raw = readString(map, candidates);
  if (typeof raw === 'string' && raw.length) {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function readBoolean(map: Map<string, unknown>, candidates: string[]) {
  for (const candidate of candidates) {
    const value = map.get(normalizeKey(candidate));
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (['true', '1', 'evet'].includes(trimmed)) return true;
      if (['false', '0', 'hayir'].includes(trimmed)) return false;
    }
  }
  return false;
}

function mapRegions(rows: RawRow[] | null | undefined) {
  const regionMap = new Map<number, RegionMeta>();
  rows?.forEach((row) => {
    const normalized = createNormalizedMap(row);
    const id = readNumber(normalized, ['id']);
    if (typeof id !== 'number') return;
    const displayName = readString(normalized, ['ad', 'isim', 'name', 'title'], `Bolge ${id}`);
    const lookup = REGION_NAME_LOOKUP.get(normalizeText(displayName));
    regionMap.set(id, {
      id,
      name: displayName ?? lookup?.name ?? `Bolge ${id}`,
      code: lookup?.code,
    });
  });
  return regionMap;
}

function determineSubjects(map: Map<string, unknown>) {
  const subjects = SUBJECT_KEY_MAP.filter((entry) => readBoolean(map, entry.keys)).map((entry) => entry.subject);
  return subjects.length ? Array.from(new Set(subjects)) : undefined;
}

function mapQuestionRow(row: RawRow, regions: Map<number, RegionMeta>, index: number): LocalQuestion | null {
  const normalized = createNormalizedMap(row);
  const prompt = readString(normalized, ['sorumetin', 'soru', 'question']);
  if (!prompt) return null;
  const choices: string[] = [];
  CHOICE_KEYS.forEach((keys) => {
    const value = readString(normalized, keys);
    if (value) choices.push(value);
  });
  if (choices.length < 2) {
    return null;
  }
  const correctRaw = readString(normalized, ['dogrusik', 'dogrucevap', 'cevap']);
  let correctIndex = typeof correctRaw === 'string' ? ['A', 'B', 'C', 'D'].indexOf(correctRaw.trim().toUpperCase()) : -1;
  if (correctIndex < 0) {
    const numeric = Number(correctRaw);
    if (!Number.isNaN(numeric) && numeric > 0) {
      correctIndex = numeric - 1;
    }
  }
  if (correctIndex < 0 || correctIndex >= choices.length) {
    correctIndex = 0;
  }

  const rawId = readString(normalized, ['id']);
  const regionId = readNumber(normalized, ['bolgeid', 'bolge_id']);
  const regionMeta = typeof regionId === 'number' ? regions.get(regionId) : undefined;
  const subjectIds = determineSubjects(normalized);

  return {
    id: rawId ? `SB-${rawId}` : `SB-AUTO-${index}`,
    prompt,
    choices,
    correctIndex,
    region: regionMeta?.name,
    cityCode: regionMeta?.code,
    subjectIds,
  };
}

export async function fetchSupabaseQuestionBank() {
  if (!supabaseClient) {
    return { questions: [], error: 'Supabase not configured' };
  }

  const { data: regionRows, error: regionError } = await supabaseClient.from('bolgeler').select('*');
  if (regionError) {
    console.warn('[supabase] Failed to fetch bolgeler table', regionError);
  }
  const regionMap = mapRegions(regionRows);

  const { data: questionRows, error: questionError } = await supabaseClient.from('bolge_sorulari').select('*').order('sira', { ascending: true });
  if (questionError) {
    console.error('[supabase] Failed to fetch bolge_sorulari table', questionError);
    return { questions: [], error: questionError.message };
  }

  const questions =
    questionRows
      ?.map((row, index) => mapQuestionRow(row, regionMap, index))
      .filter((question): question is LocalQuestion => Boolean(question)) ?? [];

  return {
    questions,
    error: regionError?.message,
  };
}
