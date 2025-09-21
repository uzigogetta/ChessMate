import type { RoomState } from '@/net/types';

function last4(id?: string) {
  return id ? String(id).slice(-4) : '----';
}

export function derivePlayers(state: RoomState, meId: string) {
  const wId = (state.seats as any)?.w1 ?? null;
  const bId = (state.seats as any)?.b1 ?? null;
  const getName = (id?: string | null) => {
    const raw = state.members?.find((m) => m.id === id)?.name;
    const norm = String(raw || '').trim();
    // Never persist UI labels like "Me"/"Opponent"; fall back to Guest-xxxx
    if (!norm || /^me$/i.test(norm) || /^opponent$/i.test(norm)) {
      return id ? `Guest-${last4(id)}` : 'Guest';
    }
    return norm;
  };

  const whiteName = getName(wId);
  const blackName = getName(bId);

  return {
    whiteId: wId as string | null,
    blackId: bId as string | null,
    whiteName,
    blackName,
    whiteIsMe: !!wId && wId === meId,
    blackIsMe: !!bId && bId === meId
  };
}

export function escapePGN(val: string) {
  return String(val).replace(/"/g, '\\"');
}


