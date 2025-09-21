import React from 'react';
import { View, Pressable, Text, Platform, useColorScheme } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TABS } from './tabs.config';
import { useSettings } from '@/features/settings/settings.store';
import { ThemeName, themes } from './tokens';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = Object.fromEntries(
  TABS.map((t) => [t.name, t.android.ionicon])
) as any;

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const radius = 26;
  const height = 52; // 26px radius capsule
  const paddingH = 12;
  const bottom = Math.max(8, insets.bottom + 8);
  const sys = useColorScheme();
  const mode = useSettings((s) => s.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];

  const lastIndex = state.routes.length - 1;
  const circleRoute = Platform.OS === 'ios' ? state.routes[lastIndex] : null;
  const capsuleRoutes = Platform.OS === 'ios' ? state.routes.slice(0, lastIndex) : state.routes;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 12, right: 12, bottom, height }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radius,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 0
        }}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="systemChromeMaterial" style={{ flex: 1 }} />
        ) : (
          <View style={{ flex: 1, backgroundColor: c.background }} />
        )}
        {/* subtle inner border */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', inset: 0, borderRadius: radius, borderWidth: Platform.OS === 'ios' ? 0.5 : 0, borderColor: 'rgba(255,255,255,0.28)' }}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingHorizontal: paddingH
        }}
      >
        {capsuleRoutes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const label = descriptors[route.key]?.options?.title || route.name;
          const iconName = (ICONS[route.name] || 'ios-albums-outline') as any;
          const color = isFocused ? c.primary : c.muted;
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{ alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, minWidth: 64 }}
            >
              <Ionicons name={iconName} size={22} color={color} />
              <Text style={{ color, fontSize: 12 }}>{String(label)}</Text>
            </Pressable>
          );
        })}
      </View>

      {Platform.OS === 'ios' && circleRoute && (
        <Pressable
          key={circleRoute.key}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: circleRoute.key, canPreventDefault: true });
            if (!event.defaultPrevented) navigation.navigate(circleRoute.name);
          }}
          style={{ position: 'absolute', right: -6, top: -2, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }}
        >
          <BlurView intensity={50} tint="systemChromeMaterial" style={{ position: 'absolute', inset: 0 }} />
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: 28, borderWidth: 0.6, borderColor: 'rgba(255,255,255,0.35)' }} />
          <Ionicons name={(ICONS[circleRoute.name] || 'ios-search-outline') as any} size={24} color="#0A84FF" />
        </Pressable>
      )}
    </View>
  );
}


