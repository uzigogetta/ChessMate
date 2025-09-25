import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import { Text, Button } from '@/ui/atoms';
import { useRoomStore } from '@/features/online/room.store';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';
import { commentaryController, isKnownPersona } from '@/features/commentary/commentary.controller';

export default function RoomChat() {
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const [input, setInput] = useState('');
  const version = useChatStore((s) => s.version);
  const chatAppend = useChatStore((s) => s.append);
  const [controllerState, setControllerState] = useState(commentaryController.getState());
  useEffect(() => commentaryController.subscribe(setControllerState), []);
  const msgs = useMemo(() => {
    if (!room) return [];
    return useChatStore.getState().get(room.roomId);
  }, [room, version]);
  const canChat = !!room;
  const send = () => {
    if (!room || !input.trim()) return;
    const m: ChatMsg = { id: `${Date.now()}`, from: me.name, txt: input.trim(), ts: Date.now() };
    chatAppend(room.roomId, m);
    setInput('');
    // emit to adapter if available
    (useRoomStore.getState().net as any).sendChat?.(m.txt);
  };
  const data = useMemo(() => msgs.slice().reverse(), [msgs]);
  if (!room) return null;
  return (
    <View style={{ width: 320, gap: 8 }}>
      <View style={{ maxHeight: 160, width: '100%' }}>
        {data.map((item) => {
          const persona = isKnownPersona(item.from) ? item.from : null;
          return (
            <Text key={item.id} muted style={{ color: persona ? '#7b61ff' : undefined }}>
              {`${new Date(item.ts).toLocaleTimeString()} ${item.from}: ${item.txt}`}
            </Text>
          );
        })}
        {controllerState.status === 'typing' && controllerState.lastPersona && (
          <Text muted style={{ color: '#7b61ff' }}>{`${controllerState.lastPersona} is thinking…`}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Message"
          value={input}
          onChangeText={setInput}
          style={{ flex: 1, backgroundColor: 'rgba(120,120,128,0.16)', padding: 8, borderRadius: 8 }}
        />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}


