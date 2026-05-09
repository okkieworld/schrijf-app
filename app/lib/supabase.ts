import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// We kijken of we in een browser zitten
const isBrowser = typeof window !== 'undefined';

// We maken een container die buiten de normale Next.js cyclus leeft
let client: any;

if (isBrowser) {
  // Als we in de browser zitten, kijken we of we de client al op het 'window' object hebben gezet
  if (!(window as any)._supabaseInstance) {
    (window as any)._supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  client = (window as any)._supabaseInstance;
} else {
  // Op de server maken we gewoon een nieuwe (daar heb je geen last van dubbele GoTrueClients)
  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
