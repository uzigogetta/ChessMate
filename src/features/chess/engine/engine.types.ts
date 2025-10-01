export type AIMove = { from: string; to: string; san: string; fen: string };

export type EngineInitOptions = {
  hashMB?: number;
  threads?: number;
  skill?: number;
  multipv?: number;
  moveOverheadMs?: number;
  uciOptions?: Record<string, string | number | boolean>;
};

export interface ChessEngine {
  init(opts?: EngineInitOptions): Promise<void>;
  send(command: string): void;
  onMessage(handler: (line: string) => void): void;
  dispose(): void;
}

export interface SearchCapableEngine extends ChessEngine {
  bestMove(fen: string, msBudget?: number, excludeUci?: string[]): Promise<AIMove>;
  stop?(): void;
}
