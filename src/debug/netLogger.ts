/* Simple dev logger. No-ops in production. */
const ON = __DEV__;

export function logState(tag: string, data: unknown) {
  if (!ON) return;
  try {
    // @ts-ignore
    const s = (data as any)?.state || data;
    const out = (s as any)?.fen
      ? { fen: (s as any).fen, seats: (s as any).seats, started: (s as any).started, historyLEN: (s as any).historySAN?.length }
      : s;
    // eslint-disable-next-line no-console
    console.log(`[STATE] ${tag}`, out);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[STATE] ${tag}`, data);
  }
}

export function logMove(tag: string, data: { san?: string; fen?: string; from?: string }) {
  if (!ON) return;
  // eslint-disable-next-line no-console
  console.log(`[MOVE] ${tag}`, data);
}

export function logReq(tag: string, data: unknown) {
  if (!ON) return;
  // eslint-disable-next-line no-console
  console.log(`[REQ] ${tag}`, data);
}

export function logRt(tag: string, data: unknown) {
  if (!ON) return;
  // eslint-disable-next-line no-console
  console.log(`[RT] ${tag}`, data);
}


