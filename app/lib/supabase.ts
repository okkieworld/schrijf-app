import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Deze 'createBrowserClient' is slimmer: hij onthoudt dat hij in de browser zit
// en voorkomt die "Multiple GoTrueClient" waarschuwingen.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
