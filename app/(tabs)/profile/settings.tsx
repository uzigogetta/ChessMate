import React from 'react';
import { View, Platform, Switch, Pressable, ScrollView, useColorScheme, Dimensions } from 'react-native';
import { Text, Separator, Screen } from '@/ui/atoms';
import { useSettings } from '@/features/settings/settings.store';
import { useCommentarySettings, COMMENTARY_PERSONA_IDS, COMMENTARY_DETAIL_LEVELS } from '@/features/commentary/commentary.settings';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, ThemeName } from '@/ui/tokens';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { from, roomId, returnTo } = useLocalSearchParams<{ from?: string; roomId?: string; returnTo?: string }>();
  const s = useSettings();
  const commentary = useCommentarySettings();
  const insets = useSafeAreaInsets();
  const sys = useColorScheme();
  const mode = useSettings((v) => v.theme);
  const active: ThemeName = (mode === 'system' ? (sys === 'dark' ? 'dark' : 'light') : mode) as ThemeName;
  const c = themes[active];
  const blurTint = active === 'dark' ? 'dark' : 'light';
  const minH = insets.top + Dimensions.get('window').height + 1;
  // No screen-level tab overrides here; FloatingTabBar hides automatically on non-root routes
  const backLabel = from === 'game' ? 'Game' : 'Profile';
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerTitle: 'Settings',
          headerLargeTitle: true,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (returnTo) { router.replace(String(returnTo)); return; }
                if (router.canGoBack()) { router.back(); return; }
                if (from === 'game' && roomId) { router.replace(`/game/online/${roomId}`); return; }
                router.replace('/(tabs)/profile');
              }}
              hitSlop={10}
              style={{ padding: 6 }}
            >
              <Ionicons name="chevron-back" size={22} color={c.text as any} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 24, minHeight: Platform.OS === 'android' ? minH : undefined }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 16, overflow: 'hidden' }}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint={blurTint as any} style={{ padding: 12 }}>
              <SectionCloud s={s} />
              <Separator />
              <SectionTheme s={s} />
              <Separator />
              <SectionEdges s={s} />
              <Separator />
              <SectionApp s={s} commentary={commentary} />
              <Separator />
              <SectionPieces s={s} />
            </BlurView>
          ) : (
            <View style={{ backgroundColor: (c.card as any), padding: 12 }}>
              <SectionCloud s={s} />
              <Separator />
              <SectionTheme s={s} />
              <Separator />
              <SectionEdges s={s} />
              <Separator />
              <SectionApp s={s} commentary={commentary} />
              <Separator />
              <SectionPieces s={s} />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Divider() { return <Separator style={{ marginVertical: 8 }} />; }

function Row({ left, right, onPress }: { left: React.ReactNode; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
      <View>{left}</View>
      {right}
    </Pressable>
  );
}

function SectionCloud({ s }: { s: ReturnType<typeof useSettings> }) {
  return (
    <Row
      left={<Text style={{ fontSize: 16 }}>Cloud archive</Text>}
      right={<Switch value={s.cloudArchive} onValueChange={(v) => { Haptics.selectionAsync(); s.setCloudArchive(v); }} />}
    />
  );
}

function SectionTheme({ s }: { s: ReturnType<typeof useSettings> }) {
  const sys = useColorScheme();
  const mode = useSettings((v) => v.theme);
  const isDark = (mode === 'system' ? sys === 'dark' : mode === 'dark');
  const palette = themes[isDark ? 'dark' : 'light'];
  const isDefault = s.boardTheme === 'default';
  const isClassic = s.boardTheme === 'classicGreen';
  const isNative = s.boardTheme === 'native';
  return (
    <Row
      left={<Text style={{ fontSize: 16 }}>Board theme</Text>}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => { if (!isDefault) Haptics.selectionAsync(); s.setBoardTheme('default'); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: isDefault ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: isDefault ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
            <Text selectable={false}>Default</Text>
          </Pressable>
          <Pressable onPress={() => { if (!isClassic) Haptics.selectionAsync(); s.setBoardTheme('classicGreen'); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: isClassic ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: isClassic ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
            <Text selectable={false}>Classic</Text>
          </Pressable>
          <Pressable onPress={() => { if (!isNative) Haptics.selectionAsync(); s.setBoardTheme('native'); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: isNative ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: isNative ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
            <Text selectable={false}>Native</Text>
          </Pressable>
        </View>
      }
    />
  );
}

function SectionEdges({ s }: { s: ReturnType<typeof useSettings> }) {
  return (
    <Row
      left={<Text style={{ fontSize: 16 }}>Full-edge board</Text>}
      right={<Switch value={s.fullEdgeBoard} onValueChange={(v) => { Haptics.selectionAsync(); s.setFullEdgeBoard(v); }} />}
    />
  );
}

function SectionApp({ s, commentary }: { s: ReturnType<typeof useSettings>; commentary: ReturnType<typeof useCommentarySettings> }) {
  const theme = s.theme;
  const sys = useColorScheme();
  const mode = useSettings((v) => v.theme);
  const isDark = (mode === 'system' ? sys === 'dark' : mode === 'dark');
  const palette = themes[isDark ? 'dark' : 'light'];
  return (
    <View>
      <Row
        left={<Text style={{ fontSize: 16 }}>App theme</Text>}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['system','light','dark'] as const).map((opt) => {
              const active = theme === opt;
              return (
                <Pressable key={opt} onPress={() => { if (theme !== opt) Haptics.selectionAsync(); s.setTheme(opt); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: active ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: active ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
                  <Text selectable={false} style={{ textTransform: 'capitalize' }}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        }
      />
      <Divider />
      <Row
        left={<Text style={{ fontSize: 16 }}>Commentary</Text>}
        right={<Switch value={commentary.enabled} onValueChange={(v) => { Haptics.selectionAsync(); commentary.setEnabled(v); }} />}
      />
      <Divider />
      <Row
        left={<Text style={{ fontSize: 16 }}>Persona</Text>}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {COMMENTARY_PERSONA_IDS.map((id) => {
              const active = commentary.persona === id;
              return (
                <Pressable key={id} onPress={() => { if (!active) { Haptics.selectionAsync(); commentary.setPersona(id); } }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: active ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: active ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
                  <Text selectable={false} style={{ textTransform: 'capitalize' }}>{id}</Text>
                </Pressable>
              );
            })}
          </View>
        }
      />
      <Divider />
      <Row
        left={<Text style={{ fontSize: 16 }}>Detail</Text>}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {COMMENTARY_DETAIL_LEVELS.map((id) => {
              const active = commentary.detail === id;
              return (
                <Pressable key={id} onPress={() => { if (!active) { Haptics.selectionAsync(); commentary.setDetail(id); } }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: active ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: active ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
                  <Text selectable={false} style={{ textTransform: 'capitalize' }}>{id}</Text>
                </Pressable>
              );
            })}
          </View>
        }
      />
      <Divider />
      <Row
        left={<Text style={{ fontSize: 16 }}>Typing indicator</Text>}
        right={<Switch value={commentary.typingIndicator} onValueChange={(v) => { Haptics.selectionAsync(); commentary.setTypingIndicator(v); }} />}
      />
      <Divider />
      <Row left={<Text style={{ fontSize: 16 }}>Haptics</Text>} right={<Switch value={s.haptics} onValueChange={(v) => { Haptics.selectionAsync(); s.setHaptics(v); }} />} />
      <Divider />
      <Row left={<Text style={{ fontSize: 16 }}>Sounds</Text>} right={<Switch value={s.sounds} onValueChange={(v) => { Haptics.selectionAsync(); s.setSounds(v); }} />} />
      <Divider />
      <Row left={<Text style={{ fontSize: 16 }}>High contrast UI</Text>} right={<Switch value={s.highContrast} onValueChange={(v) => { Haptics.selectionAsync(); s.setHighContrast(v); }} />} />
      <Divider />
      <Row left={<Text style={{ fontSize: 16 }}>Reduce motion</Text>} right={<Switch value={s.reduceMotion} onValueChange={(v) => { Haptics.selectionAsync(); s.setReduceMotion(v); }} />} />
      <Divider />
      <Row left={<Text style={{ fontSize: 16 }}>Larger UI</Text>} right={<Switch value={s.largeUI} onValueChange={(v) => { Haptics.selectionAsync(); s.setLargeUI(v); }} />} />
    </View>
  );
}

function SectionPieces({ s }: { s: ReturnType<typeof useSettings> }) {
  const current = s.pieceSet;
  const sys = useColorScheme();
  const mode = useSettings((v) => v.theme);
  const isDark = (mode === 'system' ? sys === 'dark' : mode === 'dark');
  const palette = themes[isDark ? 'dark' : 'light'];
  return (
    <Row
      left={<Text style={{ fontSize: 16 }}>Piece set</Text>}
      right={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['default','native'] as const).map((opt) => {
            const active = current === opt;
            return (
              <Pressable key={opt} onPress={() => { if (current !== opt) Haptics.selectionAsync(); s.setPieceSet(opt); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: active ? palette.primary + '33' : 'transparent', borderWidth: 1, borderColor: active ? palette.primary + '80' : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)') }}>
                <Text selectable={false} style={{ textTransform: 'capitalize' }}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      }
    />
  );
}

// (SwiftUI helper stubs removed)


