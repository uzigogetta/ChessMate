import React from 'react';
import { Stack } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';

import { ArchiveScreen } from '@/features/archive/ArchiveScreen';

export default function ArchiveRouteAndroid() {
  const { theme } = useSettings();
  const c = themes[(theme as ThemeName) || 'light'];
  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Archive' }} />
      <ArchiveScreen />
    </>
  );
}
