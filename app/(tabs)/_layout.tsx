import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, DynamicColorIOS } from 'react-native';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TABS } from '@/ui/tabs.config';

export default function TabsLayout() {
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs
        minimizeBehavior="onScrollDown"
        disableTransparentOnScrollEdge
        tabBarAppearance="floating"
        materialBackgroundColor={DynamicColorIOS({ light: '#f8f9fb', dark: '#111114' })}
      >
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name as any}>
            <Icon sf={{ default: t.ios.sfDefault, selected: t.ios.sfSelected }} />
            <Label>{t.label}</Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => route.name === t.name || route.name.startsWith(`${t.name}/`));
        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, size }) => tab ? <Ionicons name={tab.android.ionicon as any} size={size} color={color} /> : null,
          tabBarLabel: tab?.label,
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="play" options={{ title: 'Play' }} />
      <Tabs.Screen name="puzzles" options={{ title: 'Puzzles' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
