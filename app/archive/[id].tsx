import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { getGame } from '@/archive/db';
import { isUploaded } from '@/archive/cloud';

export default function ArchiveDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pgn, setPgn] = useState<string>('');
  const [meta, setMeta] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const g = await getGame(String(id));
      setMeta(g);
      setPgn(g?.pgn || '');
    })();
  }, [id]);
  return (
    <Screen>
      <Card style={{ gap: 8 }}>
        <Text>
          {meta ? `${meta.whiteName || 'White'} vs ${meta.blackName || 'Black'} — ${meta.result} ${meta?.id && isUploaded(meta.id) ? '☁︎' : ''}` : 'Loading…'}
        </Text>
        <Text muted>{meta ? new Date(meta.createdAt).toLocaleString() : ''}</Text>
      </Card>
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <Text style={{ fontSize: 14 }}>{pgn}</Text>
      </Card>
      <Button title="Replay (soon)" onPress={() => {}} />
    </Screen>
  );
}


