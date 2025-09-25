import { create } from 'zustand';
import { kv } from '@/features/storage/mmkv';

export type ChatMsg = { id: string; from: string; txt: string; ts: number };

type ChatState = {
  version: number;
  get: (roomId: string) => ChatMsg[];
  append: (roomId: string, msg: ChatMsg) => void;
  setAll: (roomId: string, msgs: ChatMsg[]) => void;
  clear: (roomId: string) => void;
  remove: (roomId: string, messageId: string) => void;
};

const key = (roomId: string) => `cm.chat.${roomId}`;

export const useChatStore = create<ChatState>((set) => ({
  version: 0,
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
    set((state) => ({ version: state.version + 1 }));
  },
  setAll(roomId, msgs) {
    const next = msgs.slice(-100);
    kv.set(key(roomId), JSON.stringify(next));
    set((state) => ({ version: state.version + 1 }));
  },
  clear(roomId) {
    kv.delete(key(roomId));
    set((state) => ({ version: state.version + 1 }));
  },
  remove(roomId, messageId) {
    const arr = useChatStore.getState().get(roomId);
    const next = arr.filter((msg) => msg.id !== messageId);
    kv.set(key(roomId), JSON.stringify(next));
    set((state) => ({ version: state.version + 1 }));
  }
}));



