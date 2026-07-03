import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Centralized backend: auth, user profiles, subscriptions.
 * The anon key is a publishable client key by design (Row Level Security is
 * what protects the data) — safe to ship in the bundle. Behavioral logs and
 * Room conversations deliberately stay on-device, NOT here.
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vhmwsqehtohioitevdwh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobXdzcWVodG9oaW9pdGV2ZHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDc4MDQsImV4cCI6MjA5ODUyMzgwNH0.G60pKxzFGb1X-_cQARoT2XoaVJfttmsNaWAZ4TuDmsI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Implicit flow: tokens come back in the OAuth redirect URL fragment,
    // which we parse ourselves after the in-app browser closes.
    flowType: 'implicit',
  },
});
