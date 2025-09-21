import React from 'react';
import { Stack } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';

export default function ArchiveStackLayout() {
  const scheme = useColorScheme();
  const { theme } = useSettings();
  const active: ThemeName = (theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : theme) as ThemeName;
  const c = themes[active];

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: Platform.OS === 'ios',
        headerShadowVisible: false,
        headerLargeTitle: Platform.OS === 'ios',
        headerTitleStyle: { color: c.text },
        headerLargeTitleStyle: { color: c.text },
        ...(Platform.OS === 'ios'
          ? { headerBlurEffect: 'systemChromeMaterial' }
          : { headerStyle: { backgroundColor: c.background } }),
        headerTintColor: active === 'dark' ? '#FFFFFF' : '#000000',
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: 'Archive' }} />
    </Stack>
  );
}


