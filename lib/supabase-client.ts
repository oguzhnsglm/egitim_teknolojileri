import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (url && key) {
  supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} else if (process.env.NODE_ENV === 'development') {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_KEY. Falling back to local fixtures.');
}

export const supabaseClient = supabase;
export const supabaseAvailable = Boolean(supabaseClient);
