import React from 'react';
import { Screen, Card, Text } from '@/ui/atoms';
import { Pressable, useColorScheme, View, Platform } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/features/settings/settings.store';
import { ThemeName, themes } from '@/ui/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

export default function ProfileScreen() {
  const router = useRouter();
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            Platform.OS === 'android' ? (
              <Pressable hitSlop={10} style={{ padding: 6 }} onPress={() => router.push('/(tabs)/profile/settings')}>
                <Ionicons name="settings-outline" size={22} color={c.primary} />
              </Pressable>
            ) : (
              <Link href={'/profile/settings'} asChild>
                <Pressable>
                  <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    <BlurView intensity={25} tint={active} style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="settings-outline" size={20} color={c.primary} />
                    </BlurView>
                  </View>
                </Pressable>
              </Link>
            )
          )
        }}
      />
      <View style={{ paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Card style={{ gap: 12 }}>
          <Text>Profile</Text>
          <Pressable onPress={() => router.push('/archive')}>
            <Text>Open Archive →</Text>
          </Pressable>
          {Platform.OS === 'android' && (
            <Pressable onPress={() => router.push('/(tabs)/profile/settings')}>
              <Text>Open Settings (Android) →</Text>
            </Pressable>
          )}
        </Card>
      </View>
    </Screen>
  );
}


