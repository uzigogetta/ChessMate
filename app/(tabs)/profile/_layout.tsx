import React from 'react';
import { Stack, Link } from 'expo-router';
import { Platform, Pressable, useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileStackLayout() {
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
        headerLargeTitle: Platform.OS === 'ios',
        headerTransparent: Platform.OS === 'ios',
        headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: c.background },
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: Platform.OS !== 'ios',
        headerTitleStyle: { color: c.text },
        headerLargeTitleStyle: { color: c.text },
        headerTintColor: active === 'dark' ? '#FFFFFF' : '#000000',
        ...(Platform.OS === 'ios' ? { headerBlurEffect: 'systemChromeMaterial' } : {}),
        headerBackTitleVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Profile',
          headerRight: () => (
            <Link href={'/(tabs)/profile/settings'} asChild>
              <Pressable hitSlop={10} style={{ padding: 6 }}>
                <Ionicons name="settings-outline" size={22} color={c.primary as any} />
              </Pressable>
            </Link>
          )
        }}
      />
      <Stack.Screen name="settings" options={{ headerTitle: 'Settings', headerBackVisible: true }} initialParams={{ hideTabs: true }} />
    </Stack>
  );
}


