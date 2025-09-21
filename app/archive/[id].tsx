import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Text, Button } from '@/ui/atoms';
import { getGame } from '@/archive/db';
import { isUploaded } from '@/shared/cloud';
import { useRoomStore } from '@/features/online/room.store';

export default function ArchiveDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pgn, setPgn] = useState<string>('');
  const [meta, setMeta] = useState<any>(null);
  const me = useRoomStore((s) => s.me);
  useEffect(() => {
    (async () => {
      const g = await getGame(String(id));
      setMeta(g);
      setPgn(g?.pgn || '');
    })();
  }, [id]);
  const resultLabel = (r?: string) => r === '1-0' ? 'White won' : r === '0-1' ? 'Black won' : r === '1/2-1/2' ? 'Draw' : r || '';
  const isMe = (name?: string) => name && me?.name && name.trim() === me.name.trim();
  const safe = (name?: string, fallback = 'Guest') => (name && name.trim()) || fallback;
  const title = meta ? `${isMe(meta.whiteName) ? 'Me' : safe(meta.whiteName, 'White')} vs ${isMe(meta.blackName) ? 'Me' : safe(meta.blackName, 'Black')} — ${resultLabel(meta.result)} ${meta?.id && isUploaded(meta.id) ? '☁︎' : ''}` : 'Loading…';
  return (
    <Screen>
      <Card style={{ gap: 8 }}>
        <Text>{title}</Text>
        <Text muted>{meta ? new Date(meta.createdAt).toLocaleString() : ''}</Text>
      </Card>
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <Text style={{ fontSize: 14 }}>{pgn}</Text>
      </Card>
      <Button title="Replay (soon)" onPress={() => {}} />
    </Screen>
  );
}


