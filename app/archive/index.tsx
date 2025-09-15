import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Screen, Card, Text } from '@/ui/atoms';
import { init, listGames, type GameRow } from '@/archive/db';
import { Link } from 'expo-router';
import { isUploaded } from '@/archive/cloud';
import { useFocusEffect } from 'expo-router';

export default function ArchiveListScreen() {
  const [items, setItems] = useState<GameRow[]>([]);
  useEffect(() => {
    (async () => {
      try {
        await init();
        const rows = await listGames(100, 0);
        setItems(rows);
      } catch {}
    })();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          await init();
          const rows = await listGames(100, 0);
          if (mounted) setItems(rows);
        } catch {}
      })();
      return () => { mounted = false; };
    }, [])
  );
  return (
    <Screen>
      <Card style={{ marginBottom: 12 }}>
        <Text>Archive</Text>
      </Card>
      <View style={{ width: '100%', maxWidth: 420, gap: 8 }}>
        {items.map((g) => (
          <Link key={g.id} href={`/archive/${g.id}`} asChild>
            <Pressable>
              <Card style={{ paddingVertical: 12, paddingHorizontal: 16, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16 }}>{`${g.whiteName || 'White'} vs ${g.blackName || 'Black'}`}</Text>
                <Text muted style={{ fontSize: 14 }}>{`${new Date(g.createdAt).toLocaleString()} • ${g.mode} • Result ${g.result} • ${g.moves} moves${isUploaded(g.id) ? ' • ☁︎' : ''}`}</Text>
              </Card>
            </Pressable>
          </Link>
        ))}
        {items.length === 0 && (
          <Card>
            <Text muted>No games saved yet.</Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}


