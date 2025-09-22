import 'react-native-gesture-handler';
import '@/sentry';
import React from 'react';
import { Stack } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
                headerTransparent: true,
                headerShadowVisible: false,
                headerTitleAlign: 'center',
                headerTintColor: c.text,
                tabBarActiveTintColor: c.primary,
                tabBarInactiveTintColor: c.muted,
                ...(Platform.OS === 'ios'
                  ? {
                      headerBlurEffect: 'systemChromeMaterial',
                      headerLargeTitle: true,
                      headerTransparent: true
                    }
                  : {
                      headerStyle: { backgroundColor: c.background },
                      headerTransparent: false
                    }),
                contentStyle: { backgroundColor: c.background }
              }}
            >
              {/* Hide root header on tabs to avoid double headers when using NativeTabs */}
              <Stack.Screen key={active} name="(tabs)" options={{ headerShown: false }} />
            </Stack>
		</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}


