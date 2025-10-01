import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, View, DeviceEventEmitter } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Platform, useColorScheme } from 'react-native';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';

export default function ArchiveStackLayout() {
  const settings = useSettings();
  const rnScheme = useColorScheme();
  const sysTheme = settings.theme === 'system' ? (rnScheme === 'dark' ? 'dark' : 'light') : (settings.theme as ThemeName);
  const c = themes[sysTheme as ThemeName];
  const router = useRouter();
  function StackHeaderFilterButton() {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        onPress={() => DeviceEventEmitter.emit('openArchiveFilters')}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={25} tint={sysTheme === 'dark' ? 'dark' : 'light'} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="funnel-outline" size={20} color={c.primary as string} />
            </BlurView>
          ) : (
            <Ionicons name="funnel-outline" size={20} color={c.primary as string} />
          )}
        </View>
      </Pressable>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTransparent: Platform.OS === 'ios',
        headerBlurEffect: Platform.OS === 'ios' ? 'systemChromeMaterial' : undefined,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: Platform.OS !== 'ios',
        headerTitleStyle: { color: c.text as string },
        headerTintColor: c.text as string,
        headerBackTitleVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Archive',
          ...(Platform.OS === 'ios'
            ? {
                headerLargeTitle: true,
                headerSearchBarOptions: {
                  placeholder: 'Search games',
                  placement: 'stacked',
                  hideWhenScrolling: true,
                  obscuresBackgroundDuringPresentation: false,
                  scopeButtonTitles: ['All', 'Online', 'Local', 'AI'],
                  onChangeScopeButton: (e: any) => {
                    const idx = e?.nativeEvent?.scopeButtonIndex ?? 0;
                    const map = ['all', 'online', 'local', 'ai'] as const;
                    const next = map[Math.max(0, Math.min(3, idx))];
                    DeviceEventEmitter.emit('changeArchiveModeFilter', next);
                  },
                  onChangeText: (e: any) => {
                    DeviceEventEmitter.emit('changeArchiveQuery', e?.nativeEvent?.text ?? '');
                  },
                  onCancelButtonPress: () => {
                    DeviceEventEmitter.emit('changeArchiveQuery', '');
                  },
                } as any,
                headerRight: () => (
                  <StackHeaderFilterButton />
                ),
              }
            : {}),
        }}
      />
    </Stack>
  );
}


