import Constants from 'expo-constants';
import { SocketClient } from './socketClient';
import { HostLoopback } from './hostLoopback';

function resolveServerUrl(): string | undefined {
  const fromEnv = (process.env.EXPO_PUBLIC_SERVER_URL as string | undefined)?.trim();
  const fromExtra = ((Constants.expoConfig?.extra as any)?.serverUrl as string | undefined)?.trim();
  const candidate = fromEnv || fromExtra;
  if (!candidate) return undefined;
  // Only accept real URLs (http/https/ws/wss); ignore placeholders like $(EXPO_PUBLIC_SERVER_URL)
  if (/^(https?:|wss?:)/i.test(candidate)) return candidate;
  return undefined;
}

export const createNet = () => {
  const url = resolveServerUrl();
  return url ? new SocketClient(url) : new HostLoopback();
};


