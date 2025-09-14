import React, { useMemo, useState } from 'react';
import { View, TextInput } from 'react-native';
import { Text, Button } from '@/ui/atoms';
import { useRoomStore } from '@/features/online/room.store';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';

export default function RoomChat() {
  const room = useRoomStore((s) => s.room);
  const me = useRoomStore((s) => s.me);
  const [input, setInput] = useState('');
  const chatGet = useChatStore((s) => s.get);
  const chatAppend = useChatStore((s) => s.append);
  const msgs = useMemo(() => (room ? chatGet(room.roomId) : []), [room, chatGet]);
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
        {data.map((item) => (
          <Text key={item.id} muted>{`${new Date(item.ts).toLocaleTimeString()} ${item.from}: ${item.txt}`}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Message"
          value={input}
          onChangeText={setInput}
          style={{ flex: 1, backgroundColor: '#222', color: 'white', padding: 8, borderRadius: 8 }}
        />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}


