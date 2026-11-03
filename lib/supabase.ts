import { createClient } from '@supabase/supabase-js';

// Login only — all other data (GrowifyOS, team/brand access) goes through
// our own FastAPI backend. The publishable key here is safe to ship to the
// browser by design; it can only do what Supabase's RLS policies allow.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseKey);
