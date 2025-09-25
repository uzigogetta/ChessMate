import React from 'react';
import { View, ScrollView, Pressable, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { useCommentarySettings, COMMENTARY_PERSONA_IDS } from '@/features/commentary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AIMenuScreen() {
  const [level, setLevel] = React.useState<1|2|3|4|5|6|7|8|9|10|11|12>(4);
  const commentary = useCommentarySettings();
  const [personaId, setPersonaId] = React.useState(commentary.persona);
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Stack.Screen options={{ headerTitle: 'Play vs AI', headerTransparent: false }} />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 12), gap: 16 }}
      >
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Difficulty</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((lv) => (
              <Pressable key={lv} onPress={() => setLevel(lv as any)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: level===lv ? '#0A84FF' : '#999', opacity: level===lv ? 1 : 0.7 }}>
                <Text>{`Lv${lv}`}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Persona</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {COMMENTARY_PERSONA_IDS.map((id) => {
              const active = personaId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setPersonaId(id)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: active ? '#7c4dff' : 'rgba(120,120,128,0.36)',
                    backgroundColor: active ? 'rgba(124,77,255,0.15)' : 'transparent',
                  }}
                >
                  <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{id}</Text>
                  <Text muted style={{ marginTop: 4, fontSize: 12 }}>{id === 'coach' ? 'Supportive guidance' : id === 'rival' ? 'Competitive banter' : 'Analytical insights'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Coach commentary</Text>
              <Text muted style={{ marginTop: 4 }}>Toggle in-game persona feedback</Text>
            </View>
            <Switch value={commentary.enabled} onValueChange={(v) => commentary.setEnabled(v)} />
          </View>
        </Card>
        <Button title="Start Game" onPress={() => router.push({ pathname: '/game/ai', params: { level: String(level), persona: personaId, coach: commentary.enabled ? '1' : '0' } })} />
      </ScrollView>
    </Screen>
  );
}


