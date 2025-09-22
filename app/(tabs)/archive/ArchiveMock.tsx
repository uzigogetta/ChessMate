import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Animated } from 'react-native';
import { Card, Text as AppText } from '@/ui/atoms';
import { Stack, useRouter } from 'expo-router';
import { themes, ThemeName, getTheme } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, RectButton, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// Minimal mock component for Android development stability
export default function ArchiveMock() {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast: settings.highContrast });
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  const mock = Array.from({ length: 20 }).map((_, i) => ({
    id: `mock-${i}`,
    createdAt: Date.now() - i * 86400000,
    mode: 'online',
    result: i % 3 === 0 ? '1-0' : i % 3 === 1 ? '0-1' : '1/2-1/2',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`,
    moves: 12 + (i % 15),
    durationMs: 5 * 60 * 1000,
    whiteName: `Player ${i+1}`,
    blackName: `Opponent ${i+1}`,
  }));
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);
  
  const renderRightActions = (progress: any) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });
    
    return (
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <RectButton
            style={{
              backgroundColor: c.danger,
              justifyContent: 'center',
              alignItems: 'center',
              width: 75,
              height: '100%',
            }}
            onPress={async () => {
              if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              alert('Delete functionality not available for mock data');
            }}
          >
            <Ionicons name="trash-outline" size={22} color="white" />
            <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>Delete</Text>
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Pressable onPress={async () => {
        if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/archive/${item.id}`);
      }}>
        <Card style={{ marginBottom: 8, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText style={{ fontSize: 16 }}>{`${item.whiteName} vs ${item.blackName}`}</AppText>
              <AppText muted style={{ fontSize: 13 }}>{`${new Date(item.createdAt).toLocaleDateString()} • ${item.mode} • ${item.moves} moves`}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Badge label={item.result === '1/2-1/2' ? '½' : item.result} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Archive',
          headerRight: () => (
            <Pressable onPress={async () => {
              if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              alert('Filters coming soon...');
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, marginRight: 12 }}>
                <Ionicons name="funnel-outline" size={20} color={c.primary} />
              </View>
            </Pressable>
          ),
        }} 
      />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <FlatList
          data={mock}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[c.primary]}
              tintColor={c.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12, marginBottom: 8 }}>
              <SearchBarHC value={''} onChange={() => {}} hc={settings.highContrast} mode={active} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText muted style={{ fontSize: 13 }}>{mock.length} results</AppText>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Ionicons name="archive-outline" size={48} color={c.muted} />
              <AppText style={{ fontSize: 18, fontWeight: '600', marginTop: 12 }}>No Games Saved</AppText>
              <AppText muted style={{ textAlign: 'center', marginTop: 4 }}>Your completed games will appear here.</AppText>
            </View>
          }
        />
      </View>
    </GestureHandlerRootView>
  );
}

function SearchBarHC({ value, onChange, hc, mode }: { value: string; onChange: (v: string) => void; hc: boolean; mode: ThemeName }) {
  const bg = hc ? (mode === 'dark' ? '#000000' : '#FFFFFF') : 'transparent';
  const fg = hc ? (mode === 'dark' ? '#FFFFFF' : '#000000') : undefined;
  const border = hc ? (mode === 'dark' ? '#1AEBFF' : '#0000FF') : 'transparent';
  return (
    <View style={{ borderRadius: 12, backgroundColor: bg, borderWidth: hc ? 2 : 0, borderColor: border, paddingHorizontal: 12, paddingVertical: 8 }}>
      <AppText muted>Search games...</AppText>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  
  if (settings.highContrast) {
    let bg = '#FFFF00';
    let fg = active === 'dark' ? '#000000' : '#FFFFFF';
    if (label === '1-0') {
      bg = active === 'dark' ? '#00FF00' : '#007F00';
      fg = active === 'dark' ? '#000000' : '#FFFFFF';
    } else if (label === '0-1') {
      bg = active === 'dark' ? '#FF0000' : '#8B0000';
      fg = '#FFFFFF';
    } else if (label === '½') {
      bg = '#8000FF';
      fg = '#FFFFFF';
    }
    return (
      <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: active === 'dark' ? '#FFFFFF' : '#000000' }}>
        <Text style={{ fontSize: 12, color: fg, fontWeight: '700' }}>{label}</Text>
      </View>
    );
  }

  const tint = active === 'dark' ? 'rgba(99,99,102,0.22)' : 'rgba(120,120,128,0.18)';
  const textColor = active === 'dark' ? '#FFFFFF' : '#0B0B0D';
  return (
    <View style={{ backgroundColor: tint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 12, color: textColor }}>{label}</Text>
    </View>
  );
}
