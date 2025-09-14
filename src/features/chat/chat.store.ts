import { create } from 'zustand';
import { kv } from '@/features/storage/mmkv';

type ChatMsg = { id: string; from: string; txt: string; ts: number };

type ChatState = {
  get: (roomId: string) => ChatMsg[];
  append: (roomId: string, msg: ChatMsg) => void;
  setAll: (roomId: string, msgs: ChatMsg[]) => void;
};

const key = (roomId: string) => `cm.chat.${roomId}`;

export const useChatStore = create<ChatState>(() => ({
  get(roomId) {
    try {
      const raw = kv.getString(key(roomId));
      if (!raw) return [];
      return JSON.parse(raw) as ChatMsg[];
    } catch {
      return [];
    }
  },
  append(roomId, msg) {
    const arr = useChatStore.getState().get(roomId);
    const next = [...arr, msg].slice(-100);
    kv.set(key(roomId), JSON.stringify(next));
  },
  setAll(roomId, msgs) {
    const next = msgs.slice(-100);
    kv.set(key(roomId), JSON.stringify(next));
  }
}));

export type { ChatMsg };


