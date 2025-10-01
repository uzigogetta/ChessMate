import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen, Card, Text, Button, Badge } from '@/ui/atoms';
import { useSettings } from '@/features/settings/settings.store';
import { themes, ThemeName } from '@/ui/tokens';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEngineSettings } from '@/features/chess/engine/engineSettings.store';
import { resolvePersona } from '@/features/commentary';
import { useCommentarySettings } from '@/features/commentary';
import type { EngineMode } from '@/features/chess/engine/engineSettings.store';

type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

function Radio({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? '#7b61ff' : '#555', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#7b61ff' }} />}
      </View>
      <Text>{label}</Text>
    </Pressable>
  );
}

function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const decrement = React.useCallback(() => { onChange(Math.max(min, value - step)); }, [min, value, step, onChange]);
  const increment = React.useCallback(() => { onChange(Math.min(max, value + step)); }, [max, value, step, onChange]);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={decrement} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>-</Text>
        </Pressable>
        <Text style={{ width: 48, textAlign: 'center' }}>{value}</Text>
        <Pressable onPress={increment} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AISetupScreen() {
  const router = useRouter();
  const settings = useSettings();
  const engineSettings = useEngineSettings();
  const commentarySettings = useCommentarySettings();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const themeName: ThemeName = (settings.theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : settings.theme) as ThemeName;
  const palette = themes[themeName];

  const [side, setSide] = useState<'white' | 'black' | 'random'>('random');
  const [difficulty, setDifficulty] = useState<Difficulty>(6);
  const [coachEnabled, setCoachEnabled] = useState(commentarySettings.enabled);
  const [selectedPersona, setSelectedPersona] = useState(commentarySettings.persona ?? 'magnus');
  const [engineReady, setEngineReady] = useState(false);

  const personas = [
    { id: 'magnus', name: 'Magnus', desc: 'World Champion precision' },
    { id: 'hikaru', name: 'Hikaru', desc: 'Speed chess master' },
    { id: 'levy', name: 'Levy', desc: 'Educational & encouraging' },
    { id: 'agadmator', name: 'Agadmator', desc: 'Classic commentary style' },
  ];

  React.useEffect(() => {
    // Pre-initialize engine on setup screen so it's ready before game starts
    const startTime = Date.now();
    import('@/features/chess/engine/EngineManager')
      .then((m) => m.configureEngineWithSettings())
      .then(() => {
        const elapsed = Date.now() - startTime;
        console.log(`[AI Setup] Engine ready in ${elapsed}ms`);
        setEngineReady(true);
      })
      .catch((err) => {
        console.warn('[AI Setup] Engine init failed', err);
        setEngineReady(false);
      });
  }, []);

  const startGame = () => {
    const params = new URLSearchParams({
      level: difficulty.toString(),
      coach: coachEnabled ? '1' : '0',
      persona: selectedPersona,
    });
    router.push(`/game/ai?${params.toString()}`);
  };

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <Stack.Screen
        options={{
          headerTitle: 'AI Game Setup',
          headerLargeTitle: Platform.OS === 'ios',
          headerTransparent: Platform.OS === 'ios',
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 80, gap: 20 }}
      >
        <Card style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: palette.text }}>Your Side</Text>
          <View style={{ gap: 8 }}>
            <Radio label="White" selected={side === 'white'} onPress={() => setSide('white')} />
            <Radio label="Black" selected={side === 'black'} onPress={() => setSide('black')} />
            <Radio label="Random" selected={side === 'random'} onPress={() => setSide('random')} />
          </View>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: palette.text }}>Difficulty</Text>
          <Stepper
            label="Level"
            value={difficulty}
            min={1}
            max={12}
            onChange={(v) => setDifficulty(v as Difficulty)}
          />
          <Text muted style={{ fontSize: 13 }}>
            {difficulty <= 3 ? 'Beginner' : difficulty <= 6 ? 'Intermediate' : difficulty <= 9 ? 'Advanced' : 'Master'}
          </Text>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: palette.text }}>Coach Mode</Text>
          <Pressable
            onPress={() => setCoachEnabled(!coachEnabled)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                borderWidth: 2,
                borderColor: coachEnabled ? '#7b61ff' : '#555',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {coachEnabled && <View style={{ width: 10, height: 10, borderRadius: 1, backgroundColor: '#7b61ff' }} />}
            </View>
            <Text>Enable real-time commentary</Text>
          </Pressable>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: palette.text }}>Persona</Text>
          <View style={{ gap: 8 }}>
            {personas.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedPersona(p.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: selectedPersona === p.id ? '#7b61ff' : '#555',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedPersona === p.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#7b61ff' }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{p.name}</Text>
                  <Text muted style={{ fontSize: 13 }}>{p.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={{ gap: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: palette.text }}>Engine Settings</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {(['auto', 'native', 'browser'] as const).map((mode) => {
              const active = engineSettings.mode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => engineSettings.setMode(mode)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? '#7b61ff' : 'rgba(255,255,255,0.1)',
                    backgroundColor: active ? 'rgba(123,97,255,0.18)' : 'transparent',
                  }}
                >
                  <Text style={{ fontWeight: active ? '700' : '500', textTransform: 'capitalize' }}>{mode}</Text>
                </Pressable>
              );
            })}
          </View>

          <Stepper label="Threads" value={engineSettings.threads} min={1} max={8} onChange={(v) => engineSettings.setThreads(v)} />
          <Stepper label="Hash MB" value={engineSettings.hashMB} min={16} max={1024} step={16} onChange={(v) => engineSettings.setHashMB(v)} />
          <Stepper label="Skill" value={engineSettings.skill} min={0} max={20} onChange={(v) => engineSettings.setSkill(v)} />
          <Stepper label="MultiPV" value={engineSettings.multipv} min={1} max={5} onChange={(v) => engineSettings.setMultipv(v)} />
          <Stepper label="Move Overhead (ms)" value={engineSettings.moveOverheadMs} min={0} max={200} step={10} onChange={(v) => engineSettings.setMoveOverheadMs(v)} />
        </Card>

        <Button 
          title={engineReady ? "Start Game" : "Loading engine..."} 
          onPress={startGame}
          disabled={!engineReady}
        />
      </ScrollView>
    </Screen>
  );
}
