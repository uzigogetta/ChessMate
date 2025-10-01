import { customAlphabet } from 'nanoid/non-secure';
import { START_FEN } from '@/features/chess/logic/chess.rules';
import { detectTerminal } from '@/game/terminal';
import { dispatchCommentary, getCommentaryRoomId } from './commentary.service';
import type { CommentaryMoveEvent, CommentarySessionMeta, CommentaryPersonaId, CommentaryDetailLevel } from './commentary.types';
import { resolvePersona } from './personas';

const genId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export type CommentaryMoveInput = {
  prevFen: string;
  nextFen: string;
  moveSan: string;
  mover: 'player' | 'opponent' | 'ai';
  color: 'w' | 'b';
  historySAN: string[];
  result?: '1-0' | '0-1' | '1/2-1/2';
  resultReason?: string;
};

export type CommentarySession = {
  readonly sessionId: string;
  getMeta(): CommentarySessionMeta;
  updateMeta(meta: Partial<Omit<CommentarySessionMeta, 'sessionId'>>): void;
  emitMove(input: CommentaryMoveInput): void;
  reset(historySAN?: string[], fen?: string): void;
  getRoomId(): string;
  setCoach(enabled: boolean, persona?: CommentaryPersonaId, detail?: CommentaryDetailLevel): void;
  isCoachEnabled(): boolean;
};

export function createCommentarySession(meta: Omit<CommentarySessionMeta, 'sessionId'> & { sessionId?: string }): CommentarySession {
  let current: CommentarySessionMeta = {
    ...meta,
    sessionId: meta.sessionId ?? genId(),
  };

  const session: CommentarySession = {
    get sessionId() {
      return current.sessionId;
    },
    getMeta() {
      return current;
    },
    updateMeta(partial) {
      current = { ...current, ...partial };
    },
    emitMove(input) {
      if (!current.coachEnabled) return;
      const moveNumber = input.historySAN.length;
      let result = input.result;
      let reason = input.resultReason;
      if (!result) {
        const termination = detectTerminal('', input.historySAN);
        if (termination.over) {
          result = termination.result;
          reason = termination.reason;
        }
      }
      const event: CommentaryMoveEvent = {
        sessionId: current.sessionId,
        prevFen: input.prevFen,
        nextFen: input.nextFen,
        moveSan: input.moveSan,
        moveNumber,
        mover: input.mover,
        color: input.color,
        historySAN: input.historySAN,
        result,
        resultReason: reason,
        timestamp: Date.now(),
      };
      const personaInfo = resolvePersona(current.personaId);
      void dispatchCommentary(event, {
        session: current,
        base: {
          persona: personaInfo.id,
          detail: current.detail,
        },
      });
    },
    reset(historySAN = [], fen = START_FEN) {
      current = { ...current, sessionId: genId() };
      if (!current.coachEnabled) return;
      if (historySAN.length > 0) {
        const moveNumber = historySAN.length;
        const termination = detectTerminal('', historySAN);
        const event: CommentaryMoveEvent = {
          sessionId: current.sessionId,
          prevFen: fen,
          nextFen: fen,
          moveSan: historySAN[historySAN.length - 1] ?? '...',
          moveNumber,
          mover: 'player',
          color: fen.split(' ')[1] === 'w' ? 'b' : 'w',
          historySAN,
          result: termination.over ? termination.result : undefined,
          resultReason: termination.over ? termination.reason : undefined,
          timestamp: Date.now(),
        };
        const personaInfo = resolvePersona(current.personaId);
        void dispatchCommentary(event, {
          session: current,
          base: {
            persona: personaInfo.id,
            detail: current.detail,
          },
        });
      }
    },
    getRoomId() {
      return getCommentaryRoomId(current);
    },
    setCoach(enabled, persona, detail) {
      const personaInfo = resolvePersona(persona ?? current.personaId);
      current = {
        ...current,
        coachEnabled: enabled,
        personaId: personaInfo.id,
        detail: detail ?? current.detail,
      };
    },
    isCoachEnabled() {
      return !!current.coachEnabled;
    },
  };

  return session;
}


