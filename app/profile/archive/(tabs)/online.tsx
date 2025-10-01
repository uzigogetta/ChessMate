import React from 'react';
import { View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/features/settings/settings.store';
import { getTheme, ThemeName } from '@/ui/tokens';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/ui/atoms';

export default function ArchiveFilterTab() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const rn = useColorScheme();
  const active: ThemeName = (settings.theme === 'system' ? (rn === 'dark' ? 'dark' : 'light') : (settings.theme as ThemeName));
  const c = getTheme(active, { highContrast: settings.highContrast });
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: insets.bottom + 120 }}>
      <Ionicons name="funnel-outline" size={48} color={c.muted as any} />
      <Text muted style={{ marginTop: 12 }}>Tap the filter in the glass bar</Text>
    </View>
  );
}


