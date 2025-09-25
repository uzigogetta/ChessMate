import * as React from 'react';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';

export function useCommentaryFeed(roomId: string, limit: number = 5): ChatMsg[] {
  const version = useChatStore((s) => s.version);
  return React.useMemo(() => {
    if (!roomId) return [];
    const entries = useChatStore.getState().get(roomId);
    if (!entries || entries.length === 0) return [];
    if (limit <= 0) return entries;
    return entries.slice(Math.max(0, entries.length - limit));
  }, [roomId, version, limit]);
}

export function useLatestComment(roomId: string): ChatMsg | null {
  const feed = useCommentaryFeed(roomId, 1);
  return feed.length ? feed[0] : null;
}


