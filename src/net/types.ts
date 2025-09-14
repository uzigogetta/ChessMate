export type Player = { id: string; name: string };
export type Mode = '1v1' | '2v2';
export type Seat = 'w1' | 'w2' | 'b1' | 'b2';

export type RoomState = {
  roomId: string;
  mode: Mode;
  members: Player[];
  seats: Partial<Record<Seat, string>>;
  driver: 'w' | 'b';
  fen: string;
  historySAN: string[];
  started: boolean;
  heartbeats?: Record<string, number>; // playerId -> last ts
};

export type NetEvents =
  | { t: 'room/state'; state: RoomState }
  | { t: 'chat/msg'; from: string; txt: string }
  | { t: 'game/move'; from: string; san: string; fen: string };

export interface NetAdapter {
  join(roomId: string, mode: Mode, name: string, id: string): Promise<void>;
  leave(): void;
  seat(seat: Seat | null): void; // legacy
  seatSide?(side: 'w' | 'b'): void;
  releaseSeat?(): void;
  start(): void;
  undo?(): void;
  toggleReady?(): void;
  passBaton(): void;
  moveSAN(san: string): void;
  sendChat?(txt: string): void;
  heartbeat?(): void;
  onEvent(handler: (e: NetEvents) => void): void;
}


