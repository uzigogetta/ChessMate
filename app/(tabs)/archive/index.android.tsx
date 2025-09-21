import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, Modal, TextInput, Share, Alert } from 'react-native';
import { Card, Text as AppText, Chip, Button } from '@/ui/atoms';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { themes, ThemeName, getTheme } from '@/ui/tokens';
import { useSettings } from '@/features/settings/settings.store';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { init, listGames, deleteGame, type GameRow } from '@/archive/db';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export default function ArchiveListScreen() {
  const [items, setItems] = useState<GameRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [cloudStatus, setCloudStatus] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = getTheme(active, { highContrast: settings.highContrast });

  const fetchData = useCallback(async () => {
    try {
      // Initialize and fetch from SQLite (with fallback)
      await init();
      const rows = await listGames({ 
        mode: 'all', 
        result: 'any', 
        sort: 'new', 
        favoritesOnly: false, 
        query 
      });
      setItems(rows);
      
      // Simulate cloud status for test data
      const cloudStatuses: Record<string, boolean> = {};
      rows.forEach(row => {
        // For test data, randomly assign cloud status
        cloudStatuses[row.id] = Math.random() > 0.5;
      });
      setCloudStatus(cloudStatuses);
    } catch (error) {
      console.error('[Archive] fetchData error:', error);
      // Fallback to empty list on error
      setItems([]);
    }
  }, [query]);

  useFocusEffect(React.useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const renderLeftActions = (item: GameRow) => {
    return (
      <RectButton
        style={{ backgroundColor: '#32D74B', width: 75, justifyContent: 'center', alignItems: 'center' }}
        onPress={async () => {
          if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await Clipboard.setStringAsync(item.pgn);
          Alert.alert('Copied', 'PGN copied to clipboard', [{ text: 'OK' }]);
        }}>
        <Ionicons name="copy-outline" size={24} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Copy</Text>
      </RectButton>
    );
  };

  const renderRightActions = (item: GameRow) => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <RectButton
          style={{ backgroundColor: c.primary, width: 75, justifyContent: 'center', alignItems: 'center' }}
          onPress={async () => {
            if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Share.share({ message: item.pgn, title: `${item.whiteName} vs ${item.blackName}` });
          }}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Share</Text>
        </RectButton>
        <RectButton
          style={{ backgroundColor: '#FF3B30', width: 75, justifyContent: 'center', alignItems: 'center' }}
          onPress={async () => {
            if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await deleteGame(item.id);
            await fetchData();
          }}>
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4 }}>Delete</Text>
        </RectButton>
      </View>
    );
  };

  const renderItem = ({ item }: { item: GameRow }) => (
    <Swipeable
      renderLeftActions={() => renderLeftActions(item)}
      renderRightActions={() => renderRightActions(item)}
      friction={2}
      overshootRight={false}
      overshootLeft={false}>
      <RectButton onPress={async () => {
        if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/archive/${item.id}`);
      }}>
        <Card style={{ marginBottom: 8, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText style={{ fontSize: 16 }}>{`${item.whiteName || 'White'} vs ${item.blackName || 'Black'}`}</AppText>
              <AppText muted style={{ fontSize: 13 }}>{`${new Date(item.createdAt).toLocaleDateString()} • ${item.mode} • ${item.moves} moves`}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {cloudStatus[item.id] && (
                <Ionicons name="cloud-done" size={16} color={c.muted} />
              )}
              <Badge label={item.result === '1/2-1/2' ? '½' : item.result} />
            </View>
          </View>
        </Card>
      </RectButton>
    </Swipeable>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Archive',
          headerRight: () => (
            <Pressable onPress={async () => {
              if (settings.haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilters(true);
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card }}>
                <Ionicons name="funnel-outline" size={20} color={c.primary} />
              </View>
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          ListHeaderComponent={
            <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12, marginBottom: 8 }}>
              <SearchBarHC value={query} onChange={setQuery} hc={settings.highContrast} mode={active} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText muted style={{ fontSize: 13 }}>{items.length} {items.length === 1 ? 'result' : 'results'}</AppText>
                <Chip label={'Select'} onPress={() => {}} />
              </View>
            </View>
          }
          ListHeaderComponent={
            <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 12, marginBottom: 8 }}>
              <SearchBarHC value={query} onChange={setQuery} hc={settings.highContrast} mode={active} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText muted style={{ fontSize: 13 }}>{items.length} {items.length === 1 ? 'result' : 'results'}</AppText>
                <Chip label={'Select'} onPress={() => {}} />
              </View>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Ionicons name="archive-outline" size={48} color={c.muted} />
              <AppText style={{ fontSize: 18, fontWeight: '600', marginTop: 12 }}>No Games Saved</AppText>
              <AppText muted style={{ textAlign: 'center', marginTop: 4 }}>Your completed games will appear here.</AppText>
              <Button title="Play a Game" onPress={() => router.push('/(tabs)/play')} />
            </View>
          }
        />
      </View>
      
      <Modal visible={showFilters} animationType="fade" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowFilters(false)} />
          <View style={{ backgroundColor: c.background, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16, borderWidth: settings.highContrast ? 2 : 0, borderColor: settings.highContrast ? (active === 'dark' ? '#FFFFFF' : '#000000') : 'transparent' }}>
            <AppText style={{ fontSize: 20, fontWeight: 'bold' }}>Filter & Sort</AppText>
            <AppText muted>Filters coming soon...</AppText>
            <Button title="Done" onPress={() => setShowFilters(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function SearchBarHC({ value, onChange, hc, mode }: { value: string; onChange: (v: string) => void; hc: boolean; mode: ThemeName }) {
  const bg = hc ? (mode === 'dark' ? '#000000' : '#FFFFFF') : 'transparent';
  const fg = hc ? (mode === 'dark' ? '#FFFFFF' : '#000000') : undefined;
  const border = hc ? (mode === 'dark' ? '#1AEBFF' : '#0000FF') : 'transparent';
  return (
    <View style={{ borderRadius: 12, backgroundColor: bg, borderWidth: hc ? 2 : 0, borderColor: border, paddingHorizontal: 12, paddingVertical: 8 }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={'Search'}
        placeholderTextColor={hc ? (mode === 'dark' ? '#FFFFFF' : '#000000') : undefined}
        style={{ color: fg ?? (mode === 'dark' ? '#FFFFFF' : '#000000'), fontSize: 16 }}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.theme as 'system'|'light'|'dark';
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const highContrast = settings.highContrast;

  if (highContrast) {
    // High-contrast per-result mapping
    let bg = active === 'dark' ? '#FFFFFF' : '#000000';
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