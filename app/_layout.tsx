import 'react-native-gesture-handler';
import '@/sentry';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import { prewarm } from '@/prewarm';

export default function RootLayout() {
  const scheme = useColorScheme();
  const { theme } = useSettings();
  const active: ThemeName = (theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : theme) as ThemeName;
  const c = themes[active];
  React.useEffect(() => {
    try { prewarm(); } catch {}
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={active === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: true,
            headerTintColor: c.text as string,
            headerStyle: { backgroundColor: c.background },
            headerTitleStyle: { color: c.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.background },
            headerBackTitleVisible: false,
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen key={active} name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="archive/[id]"
            options={{
              presentation: 'card',
              headerTitle: 'Game Replay',
              headerBackTitleVisible: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


