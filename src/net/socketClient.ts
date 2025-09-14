import { io, Socket } from 'socket.io-client';
import type { Mode, NetAdapter, NetEvents, RoomState, Seat } from './types';

export class SocketClient implements NetAdapter {
  private socket: Socket | null = null;
  private handler: ((e: NetEvents) => void) | null = null;

  constructor(url?: string) {
    const server = url || (process.env.EXPO_PUBLIC_SERVER_URL as string | undefined);
    this.socket = io(server!, { autoConnect: !!server, transports: ['websocket'] });
    this.bind();
  }

  private bind() {
    if (!this.socket) return;
    this.socket.on('connect', () => {});
    this.socket.on('disconnect', () => {});
    this.socket.on('room/state', (state: RoomState) => this.emit({ t: 'room/state', state }));
    this.socket.on('chat/msg', (from: string, txt: string) => this.emit({ t: 'chat/msg', from, txt }));
    this.socket.on('game/move', (from: string, san: string, fen: string) => this.emit({ t: 'game/move', from, san, fen }));
  }

  private emit(e: NetEvents) {
    this.handler?.(e);
  }

  async join(roomId: string, mode: Mode, name: string, id: string): Promise<void> {
    this.socket?.emit('room/join', { roomId, mode, name, id });
  }
  leave(): void {
    this.socket?.emit('room/leave');
  }
  seat(seat: Seat | null): void {
    this.socket?.emit('room/seat', seat);
  }
  start(): void {
    this.socket?.emit('room/start');
  }
  toggleReady?(): void {
    this.socket?.emit('room/ready');
  }
  passBaton(): void {
    this.socket?.emit('room/passBaton');
  }
  moveSAN(san: string): void {
    this.socket?.emit('game/moveSAN', san);
  }
  undo(): void {
    this.socket?.emit('game/undo');
  }
  sendChat(txt: string): void {
    this.socket?.emit('chat/send', txt);
  }
  heartbeat(): void {
    this.socket?.emit('room/heartbeat');
  }
  onEvent(handler: (e: NetEvents) => void): void {
    this.handler = handler;
  }
}


