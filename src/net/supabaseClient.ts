import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = (Constants.expoConfig?.extra as any)?.supabaseUrl || (process.env.EXPO_PUBLIC_SUPABASE_URL as string);
const supabaseAnonKey = (Constants.expoConfig?.extra as any)?.supabaseAnonKey || (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string);

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Temporary connectivity check (DEV only)
if (__DEV__) {
  supabase
    .from('rooms')
    .select('*')
    .then(({ data, error }) => {
      // Expect [] when no rooms exist yet
      console.log('supabase rooms:', data ?? [], error ?? null);
    });
}


