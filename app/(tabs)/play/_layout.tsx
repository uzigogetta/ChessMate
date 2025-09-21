import React from 'react';
import { Stack } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';

export default function PlayStackLayout() {
  const sys = useColorScheme();
  const { theme } = useSettings();
  const active: ThemeName = (theme === 'system' ? (sys === 'dark' ? 'dark' : 'light') : theme) as ThemeName;
  const headerBlurEffect = 'systemChromeMaterial';
  const headerTint = active === 'dark' ? '#FFFFFF' : '#000000';
  const c = themes[active];
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitle: Platform.OS === 'ios',
        headerTitleStyle: { color: c.text },
        headerLargeTitleStyle: { color: c.text },
        ...(Platform.OS === 'ios' ? { headerBlurEffect } : { headerStyle: { backgroundColor: themes[active].background } }),
        headerTintColor: headerTint,
      }}
    >
      <Stack.Screen name="index" options={{ headerTitle: 'Play' }} />
    </Stack>
  );
}
