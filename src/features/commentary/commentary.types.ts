export type CommentaryPersonaId = 'coach' | 'rival' | 'analyst';

export type CommentaryDetailLevel = 'concise' | 'standard' | 'deep';

export const COMMENTARY_PERSONA_IDS: CommentaryPersonaId[] = ['coach', 'rival', 'analyst'];

export const COMMENTARY_DETAIL_LEVELS: CommentaryDetailLevel[] = ['concise', 'standard', 'deep'];

export type CommentaryMoveEvent = {
  sessionId: string;
  prevFen: string;
  nextFen: string;
  moveSan: string;
  moveNumber: number;
  mover: 'player' | 'opponent' | 'ai';
  color: 'w' | 'b';
  historySAN: string[];
  result?: '1-0' | '0-1' | '1/2-1/2';
  resultReason?: string;
  timestamp: number;
};

export type CommentarySessionMeta = {
  sessionId: string;
  mode: 'ai' | 'local' | 'online' | 'replay';
  playerName?: string;
  opponentName?: string;
  aiLevel?: number;
  roomId?: string;
  rated?: boolean;
  coachEnabled?: boolean;
  personaId?: CommentaryPersonaId;
  detail?: CommentaryDetailLevel;
};

export type CommentaryRequestPayload = CommentaryMoveEvent & {
  persona: CommentaryPersonaId;
  detail: CommentaryDetailLevel;
  meta: CommentarySessionMeta;
};

export type CommentaryResponse = {
  text: string;
  origin: 'remote' | 'fallback';
};



