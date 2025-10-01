import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, useColorScheme, DeviceEventEmitter, View } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ArchiveScreen } from '@/features/archive/ArchiveScreen';

export default function ArchiveRoute() {
  const settings = useSettings();
  const rn = useColorScheme();
  const sys: ThemeName = (settings.theme === 'system' ? (rn === 'dark' ? 'dark' : 'light') : (settings.theme as ThemeName));
  const c = themes[sys];
  const router = useRouter();
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      try { router.replace('/profile/archive/(tabs)/all'); } catch {}
    }
  }, [router]);
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Local archive-native tabs are rendered via folder-based routing at /(tabs)/_layout with <Slot/> */}
    </>
  );
}
