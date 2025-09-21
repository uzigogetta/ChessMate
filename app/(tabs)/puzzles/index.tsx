import React, { useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { Screen, Card, Text } from '@/ui/atoms';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PuzzlesScreen() {
  const [query, setQuery] = useState('');
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerTitle: 'Puzzles',
          headerLargeTitle: true,
          headerSearchBarOptions: {
            hideWhenScrolling: false,
            obscuresBackgroundDuringPresentation: false,
            placeholder: 'Search puzzles',
            onChangeText: (e: any) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery('')
          } as any
        }}
      />
      <View style={{ paddingTop: insets.top + 88, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Card system>
          <Text>{query ? `Searching: ${query}` : 'Puzzles'}</Text>
        </Card>
      </View>
    </Screen>
  );
}



