import React from 'react';
import { View, TextInput, Pressable, useColorScheme, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/features/settings/settings.store';
import { ThemeName, getTheme } from '@/ui/tokens';
import { Ionicons } from '@expo/vector-icons';
import { DeviceEventEmitter } from 'react-native';
import { ArchiveScreen } from '@/features/archive/ArchiveScreen';

export default function ArchiveAllTab() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const rn = useColorScheme();
  const active: ThemeName = (settings.theme === 'system' ? (rn === 'dark' ? 'dark' : 'light') : (settings.theme as ThemeName));
  const palette = getTheme(active, { highContrast: settings.highContrast });
  return (
    <>
      <ArchiveScreen />
      {Platform.OS === 'ios' && (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: Math.max(insets.bottom + 8, 14) }}>
          {/* Permanently expanded search in a smaller glass capsule that visually nests within the NativeTabs glass */}
          <BlurView intensity={40} tint={active} style={{ borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', inset: 0, borderRadius: 14, borderWidth: 0.6, borderColor: active === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.12)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 40 }}>
              <Ionicons name="search" size={16} color={palette.muted as any} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search games..."
                placeholderTextColor={palette.muted as any}
                style={{ flex: 1, color: palette.text, fontSize: 15 }}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                onChangeText={(t) => DeviceEventEmitter.emit('changeArchiveQuery', t)}
                returnKeyType="search"
              />
              <Pressable
                onPress={() => DeviceEventEmitter.emit('openArchiveFilters')}
                style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                accessibilityRole="button"
                accessibilityLabel="Open filters"
              >
                <Ionicons name="funnel-outline" size={16} color={palette.primary as any} />
              </Pressable>
            </View>
          </BlurView>
        </View>
      )}
    </>
  );
}


