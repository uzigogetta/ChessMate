import { COMMENTARY_PERSONA_IDS } from './commentary.types';

export type CommentaryStatus = 'idle' | 'typing' | 'error';

export type CommentaryControllerState = {
  status: CommentaryStatus;
  requestId?: string;
  lastError?: string;
  lastPersona?: string;
};

type Listener = (state: CommentaryControllerState) => void;

class CommentaryController {
  private state: CommentaryControllerState = { status: 'idle' };
  private listeners = new Set<Listener>();

  getState(): CommentaryControllerState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setState(next: CommentaryControllerState) {
    this.state = next;
    this.listeners.forEach((listener) => {
      try {
        listener(next);
      } catch {}
    });
  }
}

export const commentaryController = new CommentaryController();

export function isKnownPersona(name: string | undefined): boolean {
  if (!name) return false;
  return COMMENTARY_PERSONA_IDS.includes(name as any);
}


