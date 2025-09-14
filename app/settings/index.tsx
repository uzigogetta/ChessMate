import React from 'react';
import { View, Pressable } from 'react-native';
import { Screen, Card, Text } from '@/ui/atoms';
import { useSettings } from '@/features/settings/settings.store';

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

export default function SettingsScreen() {
  const theme = useSettings((s) => s.boardTheme);
  const setTheme = useSettings((s) => s.setBoardTheme);
  const fullEdge = useSettings((s) => s.fullEdgeBoard);
  const setFullEdge = useSettings((s) => s.setFullEdgeBoard);
  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <Text>Board Theme</Text>
        <Radio label="Default" selected={theme === 'default'} onPress={() => setTheme('default')} />
        <Radio label="Classic Green" selected={theme === 'classicGreen'} onPress={() => setTheme('classicGreen')} />
      </Card>
      <Card style={{ gap: 12, marginTop: 12 }}>
        <Text>Layout</Text>
        <Pressable onPress={() => setFullEdge(!fullEdge)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: fullEdge ? '#7b61ff' : '#555', alignItems: 'center', justifyContent: 'center' }}>
            {fullEdge && <View style={{ width: 10, height: 10, borderRadius: 1, backgroundColor: '#7b61ff' }} />}
          </View>
          <Text>Board edge-to-edge</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}


