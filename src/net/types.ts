export type Player = { id: string; name: string };
export type Mode = '1v1' | '2v2';
export type Seat = 'w1' | 'w2' | 'b1' | 'b2';

export type Phase = 'LOBBY' | 'ACTIVE' | 'RESULT';

export type RoomState = {
  roomId: string;
  mode: Mode;
  members: Player[];
  seats: Partial<Record<Seat, string>>;
  driver: 'w' | 'b';
  fen: string;
  historySAN: string[];
  started: boolean;
  phase?: Phase; // new FSM
  version?: number; // monotonic version
  startedAt?: number;
  finishedAt?: number;
  heartbeats?: Record<string, number>; // playerId -> last ts
  result?: '1-0' | '0-1' | '1/2-1/2' | '*';
  pending?: { drawFrom?: string; undoFrom?: string; restartFrom?: string };
};

export type NetEvents =
  | { t: 'room/state'; state: RoomState }
  | { t: 'chat/msg'; from: string; txt: string }
  | { t: 'game/move'; from: string; san: string; fen: string }
  | { t: 'game/finalize'; state: RoomState }
  | { t: 'game/undoReq'; from: string }
  | { t: 'game/undoAck'; ok: boolean }
  | { t: 'game/resign'; from: string; side: 'w' | 'b' }
  | { t: 'game/drawOffer'; from: string }
  | { t: 'game/drawAnswer'; from: string; accept: boolean };

export interface NetAdapter {
  join(roomId: string, mode: Mode, name: string, id: string): Promise<void>;
  leave(): void;
  seat(seat: Seat | null): void; // legacy
  seatSide?(side: 'w' | 'b'): void;
  releaseSeat?(): void;
  start(): void;
  restart?(): void;
  undo?(): void;
  toggleReady?(): void;
  passBaton(): void;
  moveSAN(san: string): void;
  sendChat?(txt: string): void;
  heartbeat?(): void;
  onEvent(handler: (e: NetEvents) => void): void;
  // Step 8: action protocol
  requestUndo?(): void;
  answerUndo?(accept: boolean): void;
  resign?(): void;
  offerDraw?(): void;
  answerDraw?(accept: boolean): void;
  answerRestart?(accept: boolean): void;
}


