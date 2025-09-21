import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { getPlayerId } from '@/core/identity';

const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
const supabaseUrl = ((extra?.supabaseUrl as string) || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = ((extra?.supabaseAnonKey as string) || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

let client: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { 'x-player-id': getPlayerId() } },
  });
} else if (__DEV__) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] env not configured; realtime adapter disabled');
}

export function isSupabaseConfigured(): boolean {
  return client !== null;
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    throw new Error('[supabase] Supabase client requested without configuration');
  }
  return client;
}

let didLogEnv = false;
export function logSupabaseEnv() {
  if (!__DEV__ || didLogEnv || !client) return;
  didLogEnv = true;
  const playerId = getPlayerId();
  // eslint-disable-next-line no-console
  console.log('[supabase] url=%s keyPresent=%s playerId=%s', supabaseUrl, !!supabaseAnonKey, playerId);
}

