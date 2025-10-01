import React, { useEffect } from 'react';
import { Platform, DynamicColorIOS } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function ArchiveTabsLayout() {
  useEffect(() => {
    // Hide the main app tab bar while Archive's local tabs are visible
    (globalThis as any).__HIDE_TABS__ = true;
    // Auto-open filter sheet when Filter tab becomes active (simple heuristic)
    const onFocus = () => {
      try { (globalThis as any).__ARCHIVE_OPEN_FILTERS__ = true; } catch {}
    };
    return () => {
      (globalThis as any).__HIDE_TABS__ = false;
      try { delete (globalThis as any).__ARCHIVE_OPEN_FILTERS__; } catch {}
    };
  }, []);

  if (Platform.OS !== 'ios') {
    // Android: let child screens render; local tabs are iOS-only per request
    return <></>;
  }

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
      tabBarAppearance="floating"
      materialBackgroundColor={DynamicColorIOS({ light: '#f8f9fb', dark: '#111114' })}
    >
      <NativeTabs.Trigger name="all">
        <Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="online">
        <Icon sf={{ default: 'line.3.horizontal.decrease.circle', selected: 'line.3.horizontal.decrease.circle.fill' }} />
        <Label>Filter</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}


