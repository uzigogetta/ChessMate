export type AIMove = { from: string; to: string; san: string; fen: string };

export interface Engine {
  init(): Promise<void>;
  bestMove(fen: string, msBudget?: number): Promise<AIMove>;
  stop?(): void;
}


