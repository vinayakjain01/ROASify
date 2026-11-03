import { createClient } from '@supabase/supabase-js';

// Login only — all other data (GrowifyOS, team/brand access) goes through
// our own FastAPI backend. The publishable key here is safe to ship to the
// browser by design; it can only do what Supabase's RLS policies allow.
//
// createClient() throws immediately on an empty URL — fatal during the
// static export build in environments without these env vars set (e.g. CI,
// which never needs to actually log in). Fall back to a syntactically valid
// placeholder there so the build/prerender never breaks; any real auth call
// made against the placeholder would simply fail at runtime, same as any
// other misconfiguration would.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
