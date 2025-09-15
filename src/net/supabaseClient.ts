import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { getPlayerId } from '@/core/identity';

const supabaseUrl = (Constants.expoConfig?.extra as any)?.supabaseUrl || (process.env.EXPO_PUBLIC_SUPABASE_URL as string);
const supabaseAnonKey = (Constants.expoConfig?.extra as any)?.supabaseAnonKey || (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string);

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Supabase env missing: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	global: {
		headers: { 'x-player-id': getPlayerId() }
	},
	realtime: { params: { eventsPerSecond: 20 }, selfBroadcast: true }
});

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


