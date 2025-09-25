import { COMMENTARY_DETAIL_LEVELS, COMMENTARY_PERSONA_IDS, type CommentaryMoveEvent, type CommentaryRequestPayload, type CommentaryResponse, type CommentarySessionMeta, type CommentaryPersonaId, type CommentaryDetailLevel } from './commentary.types';
import { useCommentarySettings } from './commentary.settings';
import { useChatStore, type ChatMsg } from '@/features/chat/chat.store';
import { commentaryController } from './commentary.controller';

const COMMENTARY_ROOM_PREFIX = 'cm.commentary.';

export function getCommentaryRoomId(session: CommentarySessionMeta): string {
  if (session.mode === 'online' && session.roomId) return session.roomId;
  if (session.mode === 'ai') return `${COMMENTARY_ROOM_PREFIX}ai.${session.sessionId}`;
  return `${COMMENTARY_ROOM_PREFIX}local.${session.sessionId}`;
}

function buildPromptPayload(payload: CommentaryRequestPayload) {
  return {
    persona: payload.persona,
    detail: payload.detail,
    session: payload.meta,
    move: {
      moveSan: payload.moveSan,
      moveNumber: payload.moveNumber,
      color: payload.color,
      prevFen: payload.prevFen,
      nextFen: payload.nextFen,
      historySAN: payload.historySAN.slice(-12),
      result: payload.result,
      resultReason: payload.resultReason,
      mover: payload.mover,
    },
  };
}

async function callCommentaryEndpoint(payload: CommentaryRequestPayload, signal: AbortSignal): Promise<CommentaryResponse> {
  const url = process.env.EXPO_PUBLIC_COMMENTARY_ENDPOINT;
  if (!url) {
    throw new Error('Commentary endpoint not configured');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPromptPayload(payload)),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Commentary request failed: ${response.status}`);
  }
  const json = (await response.json()) as { text?: string };
  if (!json?.text) {
    throw new Error('Commentary response missing text');
  }
  return { text: String(json.text), origin: 'remote' };
}

const FALLBACK_LINES: Record<CommentaryPersonaId, string[]> = {
  coach: [
    'Keep an eye on coordination; your pieces can work together even better.',
    'Nice idea. Consider the counterplay on the other flank as the position opens.',
    'Solid fundamentals. Stay patient and watch for tactical chances next move.',
  ],
  rival: [
    'Is that all you have? I was expecting something sharper.',
    'Bold move, lets see if you can back it up.',
    'I am not impressed yet. The clock and the board are both pressuring you now.',
  ],
  analyst: [
    'The structural imbalance favors the side with the bishop pair long term.',
    'This simplifies into an endgame where minor piece activity will decide the result.',
    'Evaluations swing based on central tension; control of d5 is pivotal.',
  ],
};

function fallbackCommentary(persona: CommentaryPersonaId): CommentaryResponse {
  const lines = FALLBACK_LINES[persona] ?? FALLBACK_LINES.coach;
  const idx = Math.floor(Math.random() * lines.length);
  return { text: lines[idx], origin: 'fallback' };
}

type DispatchOptions = {
  session: CommentarySessionMeta;
  base?: Partial<Pick<CommentaryRequestPayload, 'persona' | 'detail'>>;
};

export async function dispatchCommentary(event: CommentaryMoveEvent, options: DispatchOptions) {
  const settings = useCommentarySettings.getState();
  if (!settings.enabled) return;

  const persona: CommentaryPersonaId = options.base?.persona ?? settings.persona;
  const detail: CommentaryDetailLevel = options.base?.detail ?? settings.detail;

  if (!COMMENTARY_PERSONA_IDS.includes(persona)) return;
  if (!COMMENTARY_DETAIL_LEVELS.includes(detail)) return;

  const payload: CommentaryRequestPayload = {
    ...event,
    persona,
    detail,
    meta: options.session,
  };

  const roomId = getCommentaryRoomId(options.session);
  const requestId = `${event.sessionId}:${event.moveNumber}:${Date.now()}`;
  commentaryController.setState({ status: 'typing', requestId, lastPersona: persona });

  const typingEnabled = settings.typingIndicator;
  let typingId: string | null = null;
  if (typingEnabled) {
    typingId = `${requestId}.typing`;
    useChatStore.getState().append(roomId, {
      id: typingId,
      from: persona,
      txt: '...',
      ts: Date.now(),
    });
  }

  let response: CommentaryResponse | undefined;
  try {
    response = await callCommentaryEndpoint(payload, new AbortController().signal);
  } catch (err) {
    response = fallbackCommentary(persona);
    commentaryController.setState({
      status: 'error',
      requestId,
      lastPersona: persona,
      lastError: err instanceof Error ? err.message : String(err),
    });
  }

  if (!response) return;

  if (typingId) {
    useChatStore.getState().remove(roomId, typingId);
  }

  const msg: ChatMsg = {
    id: `${requestId}.msg`,
    from: persona,
    txt: response.text,
    ts: Date.now(),
  };
  useChatStore.getState().append(roomId, msg);
  commentaryController.setState({ status: 'idle', lastPersona: persona });
}


