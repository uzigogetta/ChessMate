import { useChatStore } from '@/features/chat/chat.store';

describe('chat.store', () => {
  it('appends and trims to 100 messages', () => {
    const roomId = 'test-room';
    useChatStore.getState().setAll(roomId, []);
    for (let i = 0; i < 120; i++) {
      useChatStore.getState().append(roomId, { id: String(i), from: 'u', txt: 'm', ts: i } as any);
    }
    const arr = useChatStore.getState().get(roomId);
    expect(arr.length).toBe(100);
    expect(arr[0].id).toBe('20');
  });
});


